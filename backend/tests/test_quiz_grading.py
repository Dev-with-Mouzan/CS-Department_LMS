import asyncio
import json
import unittest
from datetime import datetime
from unittest.mock import patch

import httpx
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.responses import Response

from app.database.database import Base, get_db
from app.dependencies.auth import get_current_user
from app.main import app, _backfill_quiz_grading_status
from app.models import Assignment, Course, Quiz, QuizAttempt, QuizQuestion, Role, StudentProfile, User


class QuizGradingTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.db = self.session_factory()

        student_role = Role(name="student")
        teacher_role = Role(name="teacher")
        self.db.add_all([student_role, teacher_role])
        self.db.flush()

        self.student = User(
            first_name="Student",
            last_name="Quiz",
            email="student-quiz@example.com",
            password_hash="hash",
            role_id=student_role.id,
        )
        self.teacher = User(
            first_name="Teacher",
            last_name="Quiz",
            email="teacher-quiz@example.com",
            password_hash="hash",
            role_id=teacher_role.id,
        )
        self.db.add_all([self.student, self.teacher])
        self.db.flush()
        self.db.add(
            StudentProfile(
                user=self.student,
                student_id="student-quiz",
                roll_number="quiz-1",
                semester=3,
                enrollment_year=2023,
                session="23-27",
                session_type="morning",
            )
        )
        self.course = Course(
            course_code="QUIZ101",
            title="Quiz Course",
            semester=3,
            session="23-27",
            session_type="morning",
            teacher_id=self.teacher.id,
        )
        self.db.add(self.course)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_quiz(self, *, attachment=False, questions=1):
        quiz = Quiz(
            course_id=self.course.id,
            teacher_id=self.teacher.id,
            title="Grading Quiz",
            attachment_url="uploads/quizzes/brief.pdf" if attachment else None,
            attachment_name="brief.pdf" if attachment else None,
        )
        self.db.add(quiz)
        self.db.flush()
        for index in range(questions):
            self.db.add(
                QuizQuestion(
                    quiz_id=quiz.id,
                    text=f"Question {index + 1}",
                    options=json.dumps(["wrong", "right"]),
                    correct_index=1,
                    order_index=index,
                )
            )
        self.db.commit()
        return quiz

    def request(self, user, method, path, **kwargs):
        async def make_request():
            app.dependency_overrides[get_current_user] = lambda: user
            app.dependency_overrides[get_db] = lambda: self.db
            transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://testserver",
            ) as client:
                return await client.request(method, path, **kwargs)

        try:
            return asyncio.run(make_request())
        finally:
            app.dependency_overrides.clear()

    def test_mcq_submission_is_automatically_graded(self):
        quiz = self.add_quiz(questions=2)

        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={
                "answers": [
                    {"question_id": self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.order_index)[0].id, "selected_index": 1},
                    {"question_id": self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.order_index)[1].id, "selected_index": 0},
                ]
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["score"], 1)
        self.assertEqual(body["total"], 2)
        self.assertEqual(body["grading_status"], "graded")
        self.assertIsNone(body["grade"])

    def test_duplicate_quiz_answers_are_rejected(self):
        quiz = self.add_quiz(questions=1)
        question_id = self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).one().id

        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={
                "answers": [
                    {"question_id": question_id, "selected_index": 1},
                    {"question_id": question_id, "selected_index": 1},
                ]
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_grading_status_backfill_marks_mcq_attempts_graded(self):
        quiz = self.add_quiz(questions=1)
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            student_id=self.student.id,
            score=1,
            total=1,
            grading_status="submitted",
        )
        self.db.add(attempt)
        self.db.commit()

        _backfill_quiz_grading_status(self.db)

        self.assertEqual(attempt.grading_status, "graded")

    def test_document_quiz_stores_max_marks(self):
        with patch("app.routers.quizzes.save_file", return_value="uploads/quizzes/brief.pdf"):
            response = self.request(
                self.teacher,
                "POST",
                "/api/quizzes",
                data={
                    "course_id": self.course.id,
                    "title": "Written quiz",
                    "questions": "[]",
                    "max_marks": "20",
                },
                files={"attachment": ("brief.pdf", b"brief", "application/pdf")},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["max_marks"], 20)

    def test_incomplete_quiz_answers_are_rejected(self):
        quiz = self.add_quiz(questions=2)
        question_id = self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.order_index)[0].id

        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [{"question_id": question_id, "selected_index": 0}]},
        )

        self.assertEqual(response.status_code, 400)

    def test_mcq_submission_rejects_foreign_and_out_of_range_answers(self):
        quiz = self.add_quiz(questions=1)

        foreign = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [{"question_id": "foreign", "selected_index": 0}]},
        )
        out_of_range = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [{"question_id": self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).one().id, "selected_index": 2}]},
        )

        self.assertEqual(foreign.status_code, 400)
        self.assertEqual(out_of_range.status_code, 400)

    def test_file_submission_rejects_foreign_and_out_of_range_answers_before_saving(self):
        quiz = self.add_quiz(attachment=True, questions=1)
        question_id = self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).one().id
        with patch("app.routers.quizzes.save_file") as save_file:
            foreign = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz.id}/submit-file",
                data={"answers": json.dumps([{"question_id": "foreign", "selected_index": 0}])},
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )
            out_of_range = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz.id}/submit-file",
                data={"answers": json.dumps([{"question_id": question_id, "selected_index": 2}])},
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )

        self.assertEqual(foreign.status_code, 400)
        self.assertEqual(out_of_range.status_code, 400)
        save_file.assert_not_called()

    def test_reused_document_quiz_keeps_grading_metadata(self):
        source = Course(
            course_code="QUIZ102",
            title="Source Quiz Course",
            semester=3,
            session="23-27",
            session_type="morning",
            teacher_id=self.teacher.id,
        )
        self.db.add(source)
        self.db.flush()
        quiz = self.add_quiz(attachment=True, questions=0)
        quiz.course_id = source.id
        quiz.max_marks = 25
        self.db.commit()

        with patch("os.path.exists", return_value=True), \
             patch("shutil.copy2") as copy_file:
            response = self.request(
                self.teacher,
                "POST",
                f"/api/courses/{self.course.id}/reuse",
                json={
                    "source_course_id": source.id,
                    "materials": [],
                    "assignments": [],
                    "quizzes": [quiz.id],
                },
            )

        self.assertEqual(response.status_code, 200)
        copied = self.db.query(Quiz).filter(
            Quiz.course_id == self.course.id,
            Quiz.id != quiz.id,
        ).one()
        self.assertTrue(copied.attachment_url.startswith("quizzes/"))
        self.assertNotIn("uploads/", copied.attachment_url)
        self.assertNotIn(".pdf.pdf", copied.attachment_url)
        copy_file.assert_called_once()
        self.assertEqual(copied.attachment_name, "brief.pdf")
        self.assertEqual(copied.max_marks, 25)

    def test_document_submission_stays_pending_teacher_grading(self):
        quiz = self.add_quiz(attachment=True, questions=0)

        with patch(
            "app.routers.quizzes.save_file",
            return_value="uploads/quiz_submissions/answer.pdf",
        ):
            response = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz.id}/submit-file",
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["score"], 0)
        self.assertEqual(body["total"], 0)
        self.assertEqual(body["grading_status"], "submitted")
        self.assertIsNone(body["grade"])

    def test_file_submission_integrity_error_returns_duplicate_response(self):
        quiz = self.add_quiz(attachment=True, questions=0)
        quiz_id = quiz.id
        original_flush = self.db.flush

        def flush_with_duplicate(*args, **kwargs):
            if any(isinstance(item, QuizAttempt) for item in self.db.new):
                raise IntegrityError("INSERT", {}, Exception("duplicate"))
            return original_flush(*args, **kwargs)

        with patch("app.routers.quizzes.save_file", return_value="quiz_submissions/race.pdf"), \
             patch("app.routers.quizzes.delete_file") as delete_file, \
             patch.object(self.db, "flush", side_effect=flush_with_duplicate):
            response = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz_id}/submit-file",
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )

        self.assertEqual(response.status_code, 400, response.text)
        delete_file.assert_called_once_with("quiz_submissions/race.pdf")

    def test_hybrid_submission_records_mcq_score_but_awaits_teacher_grade(self):

        quiz = self.add_quiz(attachment=True, questions=1)
        question_id = self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).one().id

        with patch(
            "app.routers.quizzes.save_file",
            return_value="uploads/quiz_submissions/answer.pdf",
        ):
            response = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz.id}/submit-file",
                data={"answers": json.dumps([{"question_id": question_id, "selected_index": 1}])},
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["score"], 1)
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["grading_status"], "submitted")
        self.assertIsNone(body["grade"])

    def test_file_route_rejects_dotdot_filename(self):
        async def make_request():
            with patch("app.dependencies.auth.decode_token", return_value={"sub": self.student.id}):
                transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
                async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                    return await client.get(
                        "/api/files/quizzes/file..pdf",
                        headers={"Authorization": "Bearer test"},
                    )

        response = asyncio.run(make_request())
        self.assertEqual(response.status_code, 400)

    def test_private_quiz_submission_file_rejects_other_students(self):
        quiz = self.add_quiz(attachment=True, questions=0)
        self.db.add(
            QuizAttempt(
                quiz_id=quiz.id,
                student_id=self.teacher.id,
                score=0,
                total=0,
                submission_url="quiz_submissions/private.pdf",
                grading_status="submitted",
            )
        )
        self.db.commit()
        self.student.is_active = True
        self.db.commit()

        async def make_request():
            with patch("app.database.database.SessionLocal", return_value=self.db), \
                 patch("app.dependencies.auth.decode_token", return_value={"sub": self.student.id}), \
                 patch("app.main.os.path.exists", return_value=True), \
                 patch("app.main.FileResponse", return_value=Response(b"private")):
                transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
                async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                    return await client.get(
                        "/api/files/QUIZ_SUBMISSIONS/private.pdf",
                        headers={"Authorization": "Bearer test"},
                    )

        response = asyncio.run(make_request())
        self.assertEqual(response.status_code, 404, response.text)

    def test_private_assignment_file_rejects_other_students(self):
        other_student = User(
            first_name="Other",
            last_name="Student",
            email="other-assignment@example.com",
            password_hash="hash",
            role_id=self.student.role_id,
        )
        self.db.add(other_student)
        self.db.add(
            Assignment(
                course_id=self.course.id,
                teacher_id=self.teacher.id,
                title="Private assignment",
                due_date=datetime(2026, 1, 1),
                attachment_url="assignments/private.pdf",
            )
        )
        self.db.commit()

        async def make_request():
            with patch("app.database.database.SessionLocal", return_value=self.db), \
                 patch("app.dependencies.auth.decode_token", return_value={"sub": other_student.id}), \
                 patch("app.main.os.path.exists", return_value=True), \
                 patch("app.main.FileResponse", return_value=Response(b"private")):
                transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
                async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                    return await client.get(
                        "/api/files/assignments/private.pdf",
                        headers={"Authorization": "Bearer test"},
                    )

        response = asyncio.run(make_request())
        self.assertEqual(response.status_code, 404)

    def test_enrolled_student_can_access_assignment_attachment(self):
        self.db.add(
            Assignment(
                course_id=self.course.id,
                teacher_id=self.teacher.id,
                title="Course assignment",
                due_date=datetime(2026, 1, 1),
                attachment_url="assignments/course.pdf",
            )
        )
        self.db.commit()

        async def make_request():
            with patch("app.database.database.SessionLocal", return_value=self.db), \
                 patch("app.dependencies.auth.decode_token", return_value={"sub": self.student.id}), \
                 patch("app.main.os.path.exists", return_value=True), \
                 patch("app.main.FileResponse", return_value=Response(b"assignment")):
                transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
                async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                    return await client.get(
                        "/api/files/assignments/course.pdf",
                        headers={"Authorization": "Bearer test"},
                    )

        response = asyncio.run(make_request())
        self.assertEqual(response.status_code, 200)

    def test_course_owner_can_access_quiz_submission_file(self):
        quiz = self.add_quiz(attachment=True, questions=0)
        self.db.add(
            QuizAttempt(
                quiz_id=quiz.id,
                student_id=self.student.id,
                score=0,
                total=0,
                submission_url="quiz_submissions/owned.pdf",
                grading_status="submitted",
            )
        )
        self.db.commit()

        async def make_request():
            with patch("app.database.database.SessionLocal", return_value=self.db), \
                 patch("app.dependencies.auth.decode_token", return_value={"sub": self.teacher.id}), \
                 patch("app.main.os.path.exists", return_value=True), \
                 patch("app.main.FileResponse", return_value=Response(b"private")):
                transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
                async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                    return await client.get(
                        "/api/files/quiz_submissions/owned.pdf",
                        headers={"Authorization": "Bearer test"},
                    )

        response = asyncio.run(make_request())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "private, no-store")

    def test_enrolled_student_can_access_published_quiz_attachment(self):
        self.add_quiz(attachment=True, questions=0)

        async def make_request():
            with patch("app.database.database.SessionLocal", return_value=self.db), \
                 patch("app.dependencies.auth.decode_token", return_value={"sub": self.student.id}), \
                 patch("app.main.os.path.exists", return_value=True), \
                 patch("app.main.FileResponse", return_value=Response(b"brief")):
                transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
                async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                    return await client.get(
                        "/api/files/quizzes/brief.pdf",
                        headers={"Authorization": "Bearer test"},
                    )

        response = asyncio.run(make_request())
        self.assertEqual(response.status_code, 200)

    def test_teacher_can_grade_document_quiz_attempt(self):
        quiz = self.add_quiz(attachment=True, questions=0)
        with patch(
            "app.routers.quizzes.save_file",
            return_value="uploads/quiz_submissions/answer.pdf",
        ):
            submission = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz.id}/submit-file",
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )
        attempt_id = submission.json()["id"]

        response = self.request(
            self.teacher,
            "PUT",
            f"/api/quiz-attempts/{attempt_id}/grade",
            json={"grade": 15, "feedback": "Good work"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["grade"], 15)
        self.assertEqual(body["feedback"], "Good work")
        self.assertEqual(body["grading_status"], "graded")

        student_result = self.request(
            self.student,
            "GET",
            f"/api/quizzes/{quiz.id}/attempts",
        )
        self.assertEqual(student_result.status_code, 200)
        self.assertEqual(student_result.json()["grade"], 15)
        self.assertEqual(student_result.json()["grading_status"], "graded")

    def test_current_course_owner_can_grade_reassigned_quiz(self):
        new_teacher = User(
            first_name="New",
            last_name="Teacher",
            email="new-teacher-quiz@example.com",
            password_hash="hash",
            role_id=self.teacher.role_id,
        )
        self.db.add(new_teacher)
        self.db.flush()
        quiz = self.add_quiz(attachment=True, questions=0)
        self.course.teacher_id = new_teacher.id
        self.db.commit()
        with patch(
            "app.routers.quizzes.save_file",
            return_value="uploads/quiz_submissions/answer.pdf",
        ):
            submission = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz.id}/submit-file",
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )

        response = self.request(
            new_teacher,
            "PUT",
            f"/api/quiz-attempts/{submission.json()['id']}/grade",
            json={"grade": 10, "feedback": None},
        )

        self.assertEqual(response.status_code, 200)

    def test_quiz_detail_and_delete_follow_current_course_owner(self):
        new_teacher = User(
            first_name="New",
            last_name="Teacher",
            email="new-owner-quiz@example.com",
            password_hash="hash",
            role_id=self.teacher.role_id,
        )
        self.db.add(new_teacher)
        self.db.flush()
        quiz = self.add_quiz(attachment=True, questions=0)
        self.course.teacher_id = new_teacher.id
        self.db.commit()

        old_owner_detail = self.request(self.teacher, "GET", f"/api/quizzes/{quiz.id}")
        new_owner_detail = self.request(new_teacher, "GET", f"/api/quizzes/{quiz.id}")
        old_owner_delete = self.request(self.teacher, "DELETE", f"/api/quizzes/{quiz.id}")
        new_owner_delete = self.request(new_teacher, "DELETE", f"/api/quizzes/{quiz.id}")

        self.assertEqual(old_owner_detail.status_code, 403)
        self.assertEqual(new_owner_detail.status_code, 200)
        self.assertEqual(old_owner_delete.status_code, 403)
        self.assertEqual(new_owner_delete.status_code, 200)

    def test_teacher_grade_cannot_exceed_quiz_max_marks(self):
        quiz = self.add_quiz(attachment=True, questions=0)
        quiz.max_marks = 20
        self.db.commit()
        with patch(
            "app.routers.quizzes.save_file",
            return_value="uploads/quiz_submissions/answer.pdf",
        ):
            submission = self.request(
                self.student,
                "POST",
                f"/api/quizzes/{quiz.id}/submit-file",
                files={"file": ("answer.pdf", b"answer", "application/pdf")},
            )

        response = self.request(
            self.teacher,
            "PUT",
            f"/api/quiz-attempts/{submission.json()['id']}/grade",
            json={"grade": 21, "feedback": None},
        )

        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
