import asyncio
import io
import json
import unittest

from datetime import timedelta

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models import Course, Quiz, QuizQuestion, QuizTimer, Role, StudentProfile, User, utcnow
from app.routers.quizzes import _assigned_questions


class QuizFeatureTests(unittest.TestCase):
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
            last_name="Feature",
            email="student-feature@example.com",
            password_hash="hash",
            role_id=student_role.id,
        )
        self.other_student = User(
            first_name="Other",
            last_name="Student",
            email="other-feature@example.com",
            password_hash="hash",
            role_id=student_role.id,
        )
        self.teacher = User(
            first_name="Teacher",
            last_name="Feature",
            email="teacher-feature@example.com",
            password_hash="hash",
            role_id=teacher_role.id,
        )
        self.db.add_all([self.student, self.other_student, self.teacher])
        self.db.flush()
        for user in (self.student, self.other_student):
            self.db.add(
                StudentProfile(
                    user=user,
                    student_id=user.email,
                    roll_number=f"roll-{user.id[:6]}",
                    semester=3,
                    enrollment_year=2023,
                    session="23-27",
                    session_type="morning",
                )
            )
        self.course = Course(
            course_code="FEAT101",
            title="Feature Course",
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

    def add_quiz(self, *, questions=4, total_questions=None, is_published=True, time_limit=None, deadline=None):
        quiz = Quiz(
            course_id=self.course.id,
            teacher_id=self.teacher.id,
            title="Feature Quiz",
            total_questions=total_questions,
            is_published=is_published,
            time_limit=time_limit,
            deadline=deadline,
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

    # ── Feature 1: question-bank file import ──────────────────────

    def test_parse_file_endpoint_parses_csv_question_bank(self):
        content = (
            "Question,Option A,Option B,Option C,Option D,Answer\r\n"
            "What is 2+2?,3,4,5,6,B\r\n"
            "Capital of France?,Berlin,Paris,Rome,Madrid,B\r\n"
        ).encode("utf-8")
        response = self.request(
            self.teacher,
            "POST",
            "/api/quizzes/parse-file",
            files={"file": ("bank.csv", io.BytesIO(content), "text/csv")},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(data["questions"][0]["text"], "What is 2+2?")
        self.assertEqual(data["questions"][0]["correct"], 1)

    def test_parse_file_endpoint_is_rejected_for_students(self):
        response = self.request(
            self.student,
            "POST",
            "/api/quizzes/parse-file",
            files={"file": ("bank.csv", io.BytesIO(b"q,o1,o2,A"), "text/csv")},
        )
        self.assertEqual(response.status_code, 403)

    # ── Feature 2: shuffling + per-student subset ─────────────────

    def test_student_gets_shuffled_subset_without_correct_answers(self):
        quiz = self.add_quiz(questions=4, total_questions=2)
        response = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(len(data["questions"]), 2)
        self.assertTrue(all(q["correct_index"] is None for q in data["questions"]))
        self.assertEqual([q["order_index"] for q in data["questions"]], [0, 1])

    def test_shuffle_is_deterministic_for_the_same_student(self):
        quiz = self.add_quiz(questions=6, total_questions=3)
        first = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        second = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        ids_a = [q["id"] for q in first["questions"]]
        ids_b = [q["id"] for q in second["questions"]]
        self.assertEqual(ids_a, ids_b)
        # And it matches the shared helper used for grading
        assigned = _assigned_questions(quiz, self.student.id)
        self.assertEqual(ids_a, [q.id for q in assigned])

    def test_submission_is_graded_against_the_assigned_subset_only(self):
        quiz = self.add_quiz(questions=4, total_questions=2)
        detail = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        assigned_ids = [q["id"] for q in detail["questions"]]

        # Answering only the assigned subset must succeed with total == subset size
        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [{"question_id": qid, "selected_index": 1} for qid in assigned_ids]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        attempt = response.json()
        self.assertEqual(attempt["total"], 2)
        self.assertEqual(attempt["score"], 2)

    def test_submission_with_unassigned_questions_is_rejected(self):
        quiz = self.add_quiz(questions=4, total_questions=2)
        detail = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        assigned_ids = [q["id"] for q in detail["questions"]]
        all_ids = [q.id for q in self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()]
        unassigned = [qid for qid in all_ids if qid not in assigned_ids]

        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [{"question_id": qid, "selected_index": 1} for qid in unassigned]},
        )
        self.assertEqual(response.status_code, 400)

    def test_create_quiz_rejects_total_questions_above_bank_size(self):
        response = self.request(
            self.teacher,
            "POST",
            "/api/quizzes",
            data={
                "course_id": self.course.id,
                "title": "Too many",
                "total_questions": "5",
                "questions": json.dumps([
                    {"text": "Q1", "options": ["a", "b"], "correct": 0},
                    {"text": "Q2", "options": ["a", "b"], "correct": 1},
                ]),
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("exceeds the question bank size", response.json()["detail"])

    # ── Feature 3: Excel export ───────────────────────────────────

    def test_teacher_exports_quiz_results_as_excel(self):
        quiz = self.add_quiz(questions=2)
        self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [
                {"question_id": q.id, "selected_index": 1}
                for q in self.db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
            ]},
        )
        response = self.request(self.teacher, "GET", f"/api/quizzes/{quiz.id}/export")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn(
            "spreadsheetml",
            response.headers["content-type"],
        )
        self.assertIn("attachment; filename=", response.headers["content-disposition"])
        self.assertTrue(response.content.startswith(b"PK"), "xlsx is a zip container")

    def test_export_is_forbidden_for_non_owner(self):
        quiz = self.add_quiz(questions=1)
        other_teacher = User(
            first_name="Other",
            last_name="Teacher",
            email="other-teacher@example.com",
            password_hash="hash",
            role_id=self.teacher.role_id,
        )
        self.db.add(other_teacher)
        self.db.commit()
        response = self.request(other_teacher, "GET", f"/api/quizzes/{quiz.id}/export")
        self.assertEqual(response.status_code, 403)

    # ── Feature 4: published filter + toggle ──────────────────────

    def test_create_mcq_quiz_succeeds_without_attachment(self):
        response = self.request(
            self.teacher,
            "POST",
            "/api/quizzes",
            data={
                "course_id": self.course.id,
                "title": "Plain MCQ quiz",
                "questions": json.dumps([
                    {"text": "Q1", "options": ["a", "b"], "correct": 0},
                ]),
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()
        self.assertIsNone(data["attachment_url"])
        self.assertEqual(data["question_count"], 1)
        self.assertTrue(data["is_published"])
    def test_student_list_hides_unpublished_quizzes(self):
        self.add_quiz(questions=1, is_published=True)
        self.add_quiz(questions=1, is_published=False)

        response = self.request(self.student, "GET", "/api/quizzes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertTrue(response.json()[0]["is_published"])

    def test_teacher_can_publish_and_unpublish_a_quiz(self):
        quiz = self.add_quiz(questions=1, is_published=False)

        response = self.request(
            self.teacher, "PUT", f"/api/quizzes/{quiz.id}/publish",
            json={"is_published": True},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["is_published"])

        response = self.request(
            self.teacher, "PUT", f"/api/quizzes/{quiz.id}/publish",
            json={"is_published": False},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["is_published"])

        # Student list reflects the toggle
        visible = self.request(self.student, "GET", "/api/quizzes").json()
        self.assertEqual(len(visible), 0)


    # ── Feature 5: countdown timer with auto-submit ───────────────

    def test_timed_quiz_records_start_time_once_and_returns_it(self):
        quiz = self.add_quiz(questions=2, time_limit=10)
        first = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}")
        self.assertEqual(first.status_code, 200, first.text)
        started = first.json()["started_at"]
        self.assertIsNotNone(started)
        self.assertEqual(self.db.query(QuizTimer).count(), 1)

        # Re-opening resumes the same countdown instead of resetting it
        second = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}")
        self.assertEqual(second.json()["started_at"], started)
        self.assertEqual(self.db.query(QuizTimer).count(), 1)

    def test_untimed_quiz_does_not_record_a_start_time(self):
        quiz = self.add_quiz(questions=2, time_limit=None)
        response = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}")
        self.assertIsNone(response.json()["started_at"])
        self.assertEqual(self.db.query(QuizTimer).count(), 0)

    def test_submit_after_time_limit_expired_is_rejected(self):
        quiz = self.add_quiz(questions=2, time_limit=10)
        detail = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        # Push the start time past the limit + 30s grace window
        timer = self.db.query(QuizTimer).one()
        timer.started_at = utcnow() - timedelta(minutes=quiz.time_limit + 1)
        self.db.commit()

        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [
                {"question_id": q["id"], "selected_index": 1}
                for q in detail["questions"]
            ]},
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("Time is up", response.json()["detail"])

    def test_timed_out_auto_submit_grades_partial_answers(self):
        quiz = self.add_quiz(questions=3, time_limit=10)
        detail = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        assigned = detail["questions"]
        self.assertEqual(len(assigned), 3)

        # Auto-submit arrives with only 1 of 3 answered (countdown hit zero)
        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={
                "answers": [{"question_id": assigned[0]["id"], "selected_index": 1}],
                "timed_out": True,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        attempt = response.json()
        self.assertEqual(attempt["total"], 3)
        self.assertEqual(attempt["score"], 1)

    def test_partial_submit_without_timed_out_is_still_rejected(self):
        quiz = self.add_quiz(questions=3, time_limit=10)
        detail = self.request(self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        assigned = detail["questions"]

        response = self.request(
            self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [{"question_id": assigned[0]["id"], "selected_index": 1}]},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("all quiz questions", response.json()["detail"])


    # ── Feature 6: deadline passed → all enrolled students shown ──

    def test_quiz_deadline_serialized_with_z_suffix(self):
        quiz = self.add_quiz(questions=1, deadline=utcnow() + timedelta(hours=2))
        response = self.request(self.student, "GET", "/api/quizzes")
        self.assertEqual(response.status_code, 200, response.text)
        payload = next(q for q in response.json() if q["id"] == quiz.id)
        self.assertTrue(payload["deadline"].endswith("Z"), payload["deadline"])

    def _submit_quiz(self, quiz, user=None):
        detail = self.request(user or self.student, "GET", f"/api/quizzes/{quiz.id}").json()
        response = self.request(
            user or self.student,
            "POST",
            f"/api/quizzes/{quiz.id}/submit",
            json={"answers": [
                {"question_id": q["id"], "selected_index": 1} for q in detail["questions"]
            ]},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_all_attempts_includes_enrolled_non_attempters_after_deadline(self):
        quiz = self.add_quiz(questions=2)
        self._submit_quiz(quiz)
        quiz.deadline = utcnow() - timedelta(hours=1)
        self.db.commit()

        response = self.request(self.teacher, "GET", f"/api/quizzes/{quiz.id}/all-attempts")
        self.assertEqual(response.status_code, 200, response.text)
        rows = response.json()
        self.assertEqual(len(rows), 2)
        flagged = [r for r in rows if r["not_attempted"]]
        self.assertEqual(len(flagged), 1)
        self.assertEqual(flagged[0]["student_id"], self.other_student.id)
        self.assertEqual(flagged[0]["grading_status"], "not_attempted")
        self.assertEqual(flagged[0]["student_name"], "Other Student")

    def test_all_attempts_before_deadline_stays_attempts_only(self):
        quiz = self.add_quiz(questions=2, deadline=utcnow() + timedelta(hours=1))
        self._submit_quiz(quiz)

        response = self.request(self.teacher, "GET", f"/api/quizzes/{quiz.id}/all-attempts")
        self.assertEqual(response.status_code, 200, response.text)
        rows = response.json()
        self.assertEqual(len(rows), 1)
        self.assertFalse(rows[0]["not_attempted"])

    def test_export_includes_not_attempted_rows_after_deadline(self):
        quiz = self.add_quiz(questions=2)
        self._submit_quiz(quiz)
        quiz.deadline = utcnow() - timedelta(hours=1)
        self.db.commit()

        response = self.request(self.teacher, "GET", f"/api/quizzes/{quiz.id}/export")
        self.assertEqual(response.status_code, 200, response.text)

        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(response.content))
        statuses = [row[8] for row in wb.active.iter_rows(min_row=7, values_only=True)]
        self.assertIn("Not attempted", statuses)


if __name__ == "__main__":
    unittest.main()
