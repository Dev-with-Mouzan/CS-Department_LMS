"""One-shot test-data seeder.

Adds semesters 4-7 for sessions 20-24 / 21-25 / 22-26 / 23-27, with 5 morning +
5 evening students per (session, semester), assigns one subject per
(session, semester, section) to the existing teacher, and writes all
credentials to TEST_CREDENTIALS.txt.

Idempotent: existing emails / roll numbers / course codes are skipped.
Run from the backend/ directory:  python seed_test_data.py
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models import User, Role, StudentProfile, Course
from app.dependencies.auth import hash_password

TEACHER_EMAIL = "a@gmail.com"
STUDENT_PASSWORD = "Student@123"
TEACHER_PASSWORD = "Teacher@123"

SESSIONS = {"20-24": 2020, "21-25": 2021, "22-26": 2022, "23-27": 2023}
SEMESTERS = [4, 5, 6, 7]
SECTIONS = [("morning", "M"), ("evening", "E")]
PER_SECTION = 5

SUBJECTS = {
    4: "Data Structures & Algorithms",
    5: "Database Systems",
    6: "Operating Systems",
    7: "Software Engineering",
}

FIRST_NAMES = [
    "Ali", "Hamza", "Usman", "Bilal", "Ahmed", "Saad", "Faizan", "Zain",
    "Hassan", "Umar", "Talha", "Danish", "Shahid", "Imran", "Kamran",
    "Ayesha", "Fatima", "Hina", "Sana", "Maryam", "Zainab", "Noor",
]
LAST_NAMES = [
    "Khan", "Raza", "Malik", "Sheikh", "Butt", "Chaudhry", "Qureshi",
    "Abbas", "Iqbal", "Hussain", "Ahmad", "Siddiqui", "Farooq", "Nawaz",
]


def main():
    db = SessionLocal()
    created_students, skipped_students = [], 0
    created_courses, skipped_courses = 0, 0
    try:
        teacher = db.query(User).filter(User.email == TEACHER_EMAIL).first()
        if not teacher:
            print(f"ERROR: teacher {TEACHER_EMAIL} not found. Aborting.")
            return

        teacher.password_hash = hash_password(TEACHER_PASSWORD)
        teacher.is_verified = True
        teacher.is_active = True

        student_role = db.query(Role).filter(Role.name == "student").first()
        if not student_role:
            print("ERROR: 'student' role not found. Aborting.")
            return

        student_hash = hash_password(STUDENT_PASSWORD)
        name_i = 0

        for session, year in SESSIONS.items():
            for semester in SEMESTERS:
                for section_type, initial in SECTIONS:
                    for seq in range(1, PER_SECTION + 1):
                        email = f"stu.{year}.{semester}.{section_type}.{seq}@student.gcb.edu.pk"
                        if db.query(User).filter(User.email == email).first():
                            skipped_students += 1
                            name_i += 1
                            continue

                        first = FIRST_NAMES[name_i % len(FIRST_NAMES)]
                        last = LAST_NAMES[(name_i * 7) % len(LAST_NAMES)]
                        name_i += 1

                        user = User(
                            first_name=first,
                            last_name=last,
                            email=email,
                            password_hash=student_hash,
                            role_id=student_role.id,
                            is_verified=True,
                            is_active=True,
                        )
                        db.add(user)
                        db.flush()

                        db.add(StudentProfile(
                            user_id=user.id,
                            student_id=f"STU-{year}{semester}{initial}{seq:02d}",
                            roll_number=f"{year}{semester}{initial}{seq:02d}",
                            department="Computer Science",
                            semester=semester,
                            enrollment_year=year,
                            session=session,
                            session_type=section_type,
                            is_graduated=False,
                        ))
                        created_students.append({
                            "name": f"{first} {last}",
                            "email": email,
                            "roll": f"{year}{semester}{initial}{seq:02d}",
                            "session": session,
                            "semester": semester,
                            "section": section_type,
                        })

                for section_type, initial in SECTIONS:
                    code = f"CS-{session.replace('-', '')}-{semester}{initial}"
                    if db.query(Course).filter(Course.course_code == code).first():
                        skipped_courses += 1
                        continue
                    db.add(Course(
                        course_code=code,
                        title=f"{SUBJECTS[semester]} ({session} {section_type.title()})",
                        description=f"Test subject for semester {semester}, session {session}, {section_type}.",
                        semester=semester,
                        session=session,
                        session_type=section_type,
                        teacher_id=teacher.id,
                        is_active=True,
                    ))
                    created_courses += 1

        db.commit()
    finally:
        db.close()

    txt_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "TEST_CREDENTIALS.txt")
    txt_path = os.path.abspath(txt_path)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("CS Department LMS - Test Credentials\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 70 + "\n\n")

        f.write("ADMIN\n")
        f.write("  email:    admin@gcb.edu.pk\n")
        f.write("  password: Admin@123\n\n")

        f.write("TEACHER (password reset by seeder)\n")
        f.write("  name:     Ahsan Raza\n")
        f.write(f"  email:    {TEACHER_EMAIL}\n")
        f.write(f"  password: {TEACHER_PASSWORD}\n")
        f.write(f"  courses:  {created_courses} new (all sessions 20-24/21-25/22-26/23-27,\n")
        f.write("            semesters 4-7, morning + evening)\n\n")

        f.write(f"STUDENTS ({len(created_students)}) - password: {STUDENT_PASSWORD} for all\n")
        f.write("-" * 70 + "\n")
        f.write(f"{'Session':<8} {'Sem':<4} {'Section':<8} {'Roll':<10} {'Name':<18} Email\n")
        for s in created_students:
            f.write(f"{s['session']:<8} {s['semester']:<4} {s['section']:<8} "
                    f"{s['roll']:<10} {s['name']:<18} {s['email']}\n")

    print(f"Created {len(created_students)} students ({skipped_students} skipped), "
          f"{created_courses} courses ({skipped_courses} skipped).")
    print(f"Credentials written to {txt_path}")


if __name__ == "__main__":
    main()
