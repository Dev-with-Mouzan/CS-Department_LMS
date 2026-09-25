import unittest

from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base
from app.models import Role, StudentProfile, User
from app.services.auth_service import get_student_by_roll_number


class RollNumberScopeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.db = self.session_factory()
        self.role = Role(name="student")
        self.db.add(self.role)
        self.db.commit()
        self.next_id = 1

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_student(
        self,
        roll_number,
        semester=3,
        session="23-27",
        session_type="morning",
    ):
        user_id = self.next_id
        self.next_id += 1
        user = User(
            first_name=f"Student{user_id}",
            last_name="Test",
            email=f"student{user_id}@example.com",
            password_hash="hash",
            role_id=self.role.id,
        )
        profile = StudentProfile(
            user=user,
            student_id=f"student-{user_id}",
            roll_number=roll_number,
            semester=semester,
            enrollment_year=2023,
            session=session,
            session_type=session_type,
        )
        self.db.add(profile)
        self.db.flush()
        return profile

    def add_admin(self):
        role = Role(name="admin")
        self.db.add(role)
        self.db.flush()
        user = User(
            first_name="Admin",
            last_name="Test",
            email="admin@example.com",
            password_hash="hash",
            role_id=role.id,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def test_same_scope_finds_existing_roll_number(self):
        expected = self.add_student("1")

        actual = get_student_by_roll_number(
            self.db, "1", 3, "23-27", "morning"
        )

        self.assertEqual(actual.id, expected.id)

    def test_zero_enrollment_year_still_has_scoped_session(self):
        from app.services.auth_service import create_user

        create_user(
            self.db,
            {
                "first_name": "Zero",
                "last_name": "Year",
                "email": "zero-year@example.com",
                "password": "Password1",
                "role_name": "student",
                "semester": 3,
                "enrollment_year": 0,
                "session_type": "morning",
                "roll_number": "1",
            },
        )

        profile = self.db.query(StudentProfile).filter(
            StudentProfile.roll_number == "1"
        ).one()
        self.assertEqual(profile.session, "00-04")
        self.assertIsNotNone(
            get_student_by_roll_number(self.db, "1", 3, "00-04", "morning")
        )

    def test_registration_schema_rejects_zero_enrollment_year(self):
        from pydantic import ValidationError
        from app.schemas.auth import RegisterRequest

        with self.assertRaises(ValidationError):
            RegisterRequest(
                first_name="Zero",
                last_name="Year",
                email="zero-year@example.com",
                phone="+923001234567",
                password="Password1",
                semester=3,
                enrollment_year=0,
                roll_number="1",
            )

    def test_roll_number_is_available_in_a_different_scope(self):
        self.add_student("1")

        scopes = [
            (5, "23-27", "morning"),
            (3, "24-28", "morning"),
            (3, "23-27", "evening"),
        ]
        for semester, session, session_type in scopes:
            with self.subTest(
                semester=semester,
                session=session,
                session_type=session_type,
            ):
                self.assertIsNone(
                    get_student_by_roll_number(
                        self.db, "1", semester, session, session_type
                    )
                )

    def test_database_rejects_duplicate_roll_number_in_same_scope(self):
        self.add_student("1")

        with self.assertRaises(IntegrityError):
            self.add_student("1")

    def test_startup_adds_index_to_existing_table(self):
        from app.main import _ensure_student_roll_index

        self.add_student("1")
        self.db.execute(text("DROP INDEX uq_student_roll_scope"))
        self.db.commit()

        _ensure_student_roll_index(self.db)

        with self.assertRaises(IntegrityError):
            self.add_student("1")

    def test_startup_rejects_duplicate_legacy_rows(self):
        from app.main import _ensure_student_roll_index

        self.add_student("1")
        self.db.execute(text("DROP INDEX uq_student_roll_scope"))
        self.db.commit()
        self.add_student("1")
        self.db.commit()

        with self.assertRaisesRegex(RuntimeError, "duplicate legacy rows"):
            _ensure_student_roll_index(self.db)

    def test_registration_rejects_only_duplicate_scope(self):
        import asyncio
        import httpx
        from app.database.database import get_db
        from app.main import app

        def override_get_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        async def make_requests():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://testserver",
            ) as client:
                first = await client.post(
                    "/api/auth/register",
                    json={
                        "first_name": "First",
                        "last_name": "Student",
                        "email": "first@example.com",
                        "phone": "+923001234567",
                        "password": "Password1",
                        "semester": 3,
                        "roll_number": "1",
                        "enrollment_year": 2023,
                        "session_type": "morning",
                    },
                )
                duplicate = await client.post(
                    "/api/auth/register",
                    json={
                        "first_name": "Second",
                        "last_name": "Student",
                        "email": "second@example.com",
                        "phone": "+923001234568",
                        "password": "Password1",
                        "semester": 3,
                        "roll_number": "1",
                        "enrollment_year": 2023,
                        "session_type": "morning",
                    },
                )
                other_semester = await client.post(
                    "/api/auth/register",
                    json={
                        "first_name": "Third",
                        "last_name": "Student",
                        "email": "third@example.com",
                        "phone": "+923001234569",
                        "password": "Password1",
                        "semester": 5,
                        "roll_number": "1",
                        "enrollment_year": 2023,
                        "session_type": "morning",
                    },
                )
                return first, duplicate, other_semester

        app.dependency_overrides[get_db] = override_get_db
        try:
            first, duplicate, other_semester = asyncio.run(make_requests())
        finally:
            app.dependency_overrides.clear()

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(other_semester.status_code, 201)

    def test_semester_changes_reject_existing_scoped_roll(self):
        import asyncio
        import httpx
        from app.database.database import get_db
        from app.dependencies.auth import require_admin
        from app.main import app

        student = self.add_student("1", semester=3)
        self.add_student("1", semester=5)
        admin = self.add_admin()
        self.db.commit()

        def override_get_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        async def make_requests():
            transport = httpx.ASGITransport(
                app=app,
                raise_app_exceptions=False,
            )
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://testserver",
            ) as client:
                update = await client.put(
                    f"/api/users/{student.user_id}",
                    json={"semester": 5},
                )
                promotion = await client.post(
                    "/api/users/promotion/promote",
                    json={"student_ids": [student.user_id], "to_semester": 5},
                )
                return update, promotion

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_admin] = lambda: admin
        try:
            update, promotion = asyncio.run(make_requests())
        finally:
            app.dependency_overrides.clear()

        self.assertEqual(update.status_code, 400)
        self.assertEqual(promotion.status_code, 400)
        self.db.refresh(student)
        self.assertEqual(student.semester, 3)


if __name__ == "__main__":
    unittest.main()
