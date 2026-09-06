"""Seed a large set of dummy data for local testing.

What this adds (idempotent — safe to re-run):
- 10 teachers (each with 5 courses) -> 50 courses across semesters 3/5/7/8
- 40 students (10 per semester 3, 5, 7, 8), each enrolled in every course
  of their own semester (~500 enrollments)
- Assignments (3 per course, one overdue, one upcoming, one past)
- Student submissions with files (~1300), ~70% graded, some left for review
- Attendance sessions (9 per course) + records (present/absent/late)
- Quizzes (2 per course) with 5 questions each
- Result entries (midterm/final/complete per course) with real CSV/TXT files
- Study materials (2 per course) with files
- Notices + student reviews

All dummy users share the password: password123
Unverified (for admin "verify account" testing): s303, s507, s704
"""
import os
import random
import uuid
from datetime import date, datetime, time, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

from app.config import settings
from app.database.database import Base, engine, SessionLocal
from app.dependencies.auth import hash_password
from app.models import (
    User, TeacherProfile, StudentProfile, Course, Enrollment,
    Assignment, Submission, AttendanceSession, AttendanceRecord,
    Quiz, QuizQuestion, Result, StudyMaterial, Notice, Review,
)
from app.services.auth_service import create_default_roles, get_role_by_name, get_user_by_email

DUMMY_PASSWORD = "password123"
SEMESTERS = [3, 5, 7, 8]
RNG = random.Random(42)

SUBJECTS = {
    3: [
        "Data Structures", "Digital Logic Design", "Operating Systems",
        "Computer Organization & Assembly", "Discrete Mathematics",
        "Probability & Statistics", "Object Oriented Programming",
        "Microprocessor & Interfacing", "Software Engineering Fundamentals",
        "Linear Algebra",
    ],
    5: [
        "Database Systems", "Computer Networks", "Compiler Design",
        "Theory of Automata", "Artificial Intelligence", "Web Engineering",
        "Distributed Systems", "Human Computer Interaction",
        "Parallel Computing", "Cloud Computing",
    ],
    7: [
        "Machine Learning", "Data Mining", "Network Security",
        "Mobile Application Development", "Big Data Analytics",
        "Computer Vision", "Information Security",
        "Software Project Management", "Blockchain Technology", "Deep Learning",
    ],
    8: [
        "Final Year Project", "Network Programming", "Ethical Hacking",
        "Digital Image Processing", "IoT & Embedded Systems",
        "Wireless Networks", "Natural Language Processing",
        "Cloud Security", "Game Development", "DevOps",
    ],
}

TEACHER_NAMES = [
    ("Ahmed", "Raza"), ("Ayesha", "Khan"), ("Bilal", "Hussain"), ("Fatima", "Noor"),
    ("Hamza", "Sheikh"), ("Kiran", "Tariq"), ("Imran", "Malik"), ("Sana", "Javed"),
    ("Usman", "Farooq"), ("Zainab", "Akhtar"),
]

STUDENT_FIRST = [
    "Ali", "Hira", "Ahmed", "Mahnoor", "Usman",
    "Zoya", "Hassan", "Areeba", "Muzammil", "Laiba",
]
STUDENT_LAST = [
    "Khan", "Ahmed", "Ali", "Malik", "Sheikh",
    "Nawaz", "Iqbal", "Baig", "Chaudhry", "Mirza",
]

QUIZ_QUESTIONS = [
    ("Which data structure follows LIFO order?",
     ["Stack", "Queue", "Tree", "Graph"], 0),
    ("Which of the following is a relational database?",
     ["MySQL", "FTP", "HTTP", "DNS"], 0),
    ("What is the average time complexity of binary search?",
     ["O(log n)", "O(n)", "O(n log n)", "O(1)"], 0),
    ("Which HTTP status code means 'Not Found'?",
     ["404", "200", "500", "301"], 0),
    ("Which protocol is used to send email?",
     ["SMTP", "FTP", "SNMP", "ARP"], 0),
    ("What does CPU stand for?",
     ["Central Processing Unit", "Computer Personal Unit",
      "Central Program Utility", "Control Processing Unit"], 0),
    ("Which of these is a valid IPv4 address?",
     ["192.168.1.1", "192.168.1", "256.1.1.1", "localhost"], 0),
    ("Which language is primarily used for Android app development?",
     ["Kotlin", "COBOL", "Fortran", "Pascal"], 0),
    ("In OOP, what does encapsulation hide?",
     ["Implementation details", "Public interface", "Class name", "Return type"], 0),
    ("Which is a structured query language for databases?",
     ["SQL", "XML", "HTML", "CSS"], 0),
    ("Which sorting algorithm runs in O(n log n) on average?",
     ["Merge Sort", "Bubble Sort", "Selection Sort", "Insertion Sort"], 0),
]

FEEDBACK_POOL = [
    "Well done, keep it up.", "Good attempt but revise the basics.",
    "Excellent work, very clear.", "Fair — needs improvement in core concepts.",
    "Good effort, watch the formatting.", "Solid work, minor mistakes.",
]

NOTICES = [
    ("Mid-Term Examination Schedule Released", "The mid-term exams for all BSCS semesters begin next week. Check the notice board for the complete date sheet.", "news", True, 0),
    ("Final Year Project Submission Open", "Final semester students can now submit their project proposals through their course teacher before the 15th.", "news", True, 0),
    ("Leave Application Process Update", "All students must submit leave applications at least two working days in advance through the department office.", "news", False, 0),
    ("Seminar: Trends in Artificial Intelligence", "The CS department is hosting a seminar on modern AI trends. Attendance is encouraged for all students.", "news", False, 0),
    ("Annual CS Tech Fest Registration", "Registration for the annual department tech fest is now open. Form teams and register through the student council.", "news", False, 0),
    ("Fee Payment Deadline Extension", "The fee deadline has been extended by one week. Late fees apply after the new deadline.", "news", False, 0),
]

REVIEWS = [
    (4, "Great learning experience, the LMS makes everything easy to track."),
    (5, "Attendance and results management is really smooth."),
    (5, "Submitting assignments online is so much easier than before."),
    (4, "Would love to see more interactive quizzes."),
    (5, "Very helpful dashboard, everything in one place."),
    (4, "Materials section is very useful for preparation."),
]


def _write_upload_file(subdir, filename, content):
    target_dir = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(target_dir, exist_ok=True)
    path = os.path.join(target_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return os.path.join(settings.UPLOAD_DIR, subdir, filename)


def _unique_filename(ext="txt"):
    return f"{uuid.uuid4().hex}.{ext}"


def seed(db):
    create_default_roles(db)
    admin_role = get_role_by_name(db, "admin")
    teacher_role = get_role_by_name(db, "teacher")
    student_role = get_role_by_name(db, "student")
    if not (admin_role and teacher_role and student_role):
        raise RuntimeError("Roles missing — call create_default_roles first")

    admin = None
    for u in db.query(User).filter(User.role_id == admin_role.id).all():
        admin = u
        break
    if not admin:
        admin = User(first_name="System", last_name="Admin", email=settings.ADMIN_EMAIL,
                     password_hash=hash_password(settings.ADMIN_PASSWORD),
                     role_id=admin_role.id, is_verified=True, is_active=True)
        db.add(admin)
        db.flush()

    # ── Teachers ─────────────────────────────────────────
    teachers = []
    for i, (fn, ln) in enumerate(TEACHER_NAMES, start=1):
        email = f"teacher{i}@lmsdemo.com"
        user = get_user_by_email(db, email)
        if user:
            teachers.append(user)
            continue
        user = User(first_name=fn, last_name=ln, email=email,
                    phone=f"03{i:02d}{i * 17:02d}{i * 3:03d}",
                    password_hash=hash_password(DUMMY_PASSWORD),
                    role_id=teacher_role.id, is_verified=True, is_active=True,
                    created_at=datetime.utcnow() - timedelta(days=30 + i))
        db.add(user)
        db.flush()
        db.add(TeacherProfile(user_id=user.id, employee_id=f"EMP-{i:03d}",
                              department="Computer Science",
                              qualification=RNG.choice(["Ph.D.", "M.Phil.", "M.S. (CS)"])))
        teachers.append(user)
    db.commit()

    # ── Students ─────────────────────────────────────────
    enrollment_year = {3: 2022, 5: 2021, 7: 2020, 8: 2019}
    unverified = {"s303", "s507", "s704"}
    students_by_sem = {}
    for sem in SEMESTERS:
        students_by_sem[sem] = []
        for nn in range(1, 11):
            email = f"s{sem * 100 + nn}@student.lmsdemo.com"
            user = get_user_by_email(db, email)
            if user:
                students_by_sem[sem].append(user)
                continue
            user = User(
                first_name=STUDENT_FIRST[nn - 1],
                last_name=STUDENT_LAST[(sem + nn) % len(STUDENT_LAST)],
                email=email,
                phone=f"03{sem}{nn:02d}1{sem:02d}",
                password_hash=hash_password(DUMMY_PASSWORD),
                role_id=student_role.id,
                is_verified=email.split("@")[0] not in unverified,
                is_active=True,
                created_at=datetime.utcnow() - timedelta(days=400 + sem * 30 + nn),
            )
            db.add(user)
            db.flush()
            db.add(StudentProfile(
                user_id=user.id, student_id=f"STU{sem}{nn:02d}",
                roll_number=f"BSCS{sem}{nn:02d}", department="BSCS",
                semester=sem, enrollment_year=enrollment_year[sem],
            ))
            students_by_sem[sem].append(user)
        db.commit()
    all_students = [u for sem in SEMESTERS for u in students_by_sem[sem]]

    # ── Courses: 5 per teacher, spread across semesters ──
    courses = []
    for idx in range(50):
        sem = SEMESTERS[idx % 4]
        subject = SUBJECTS[sem][(idx // 4) % len(SUBJECTS[sem])]
        code = f"CS{idx + 1:02d}"
        course = db.query(Course).filter(Course.course_code == code).first()
        if course:
            courses.append(course)
            continue
        teacher = teachers[idx % 10]
        course = Course(
            course_code=code, title=subject,
            description=f"{subject} — semester {sem} course for the BSCS program.",
            semester=sem, teacher_id=teacher.id, is_active=True,
            created_at=datetime.utcnow() - timedelta(days=150 + idx),
        )
        db.add(course)
        db.flush()
        courses.append(course)
    db.commit()

    # ── Enrollments: every student into every course of their semester ──
    new_enrollments = 0
    for course in courses:
        for student in students_by_sem[course.semester]:
            exists = db.query(Enrollment).filter(
                Enrollment.student_id == student.id,
                Enrollment.course_id == course.id,
            ).first()
            if exists:
                continue
            db.add(Enrollment(student_id=student.id, course_id=course.id,
                              enrollment_date=date.today() - timedelta(days=180),
                              status="active"))
            new_enrollments += 1
    db.commit()
    print(f"enrollments added: {new_enrollments}")

    # ── Assignments + Submissions ────────────────────────
    now = datetime.utcnow()
    assignments = []
    for course in courses:
        plans = [
            (f"{course.title} — Assignment 1", now - timedelta(days=30), 50, 10, 0.7),
            (f"{course.title} — Assignment 2", now - timedelta(days=5), 100, 10, 0.6),
            (f"{course.title} — Mid Assessment", now + timedelta(days=12), 100, 6, 0.0),
        ]
        enrolled = students_by_sem[course.semester]
        for (title, due, marks, n_submit, grade_ratio) in plans:
            existing = db.query(Assignment).filter(
                Assignment.course_id == course.id,
                Assignment.title == title,
            ).first()
            if existing:
                assignments.append(existing)
                continue
            a = Assignment(course_id=course.id, teacher_id=course.teacher_id,
                           title=title,
                           description=f"Complete {title} and submit before the deadline.",
                           due_date=due, max_marks=marks)
            db.add(a)
            db.flush()
            assignments.append(a)

            submitters = RNG.sample(enrolled, min(n_submit, len(enrolled)))
            for student in submitters:
                if due < now:  # past: mix before/after due (some late)
                    if RNG.random() < 0.8:
                        sub_time = due - timedelta(days=RNG.uniform(0.2, 6))
                    else:
                        sub_time = min(due + timedelta(hours=RNG.uniform(1, 24)), now)
                else:  # upcoming: early submissions
                    sub_time = now - timedelta(days=RNG.uniform(0, 4))

                sub_status = "late" if (due < now and RNG.random() < 0.25) else "submitted"
                filename = _unique_filename("txt")
                path = _write_upload_file(
                    "submissions", filename,
                    f"Submission by {student.first_name} {student.last_name}\n"
                    f"Course: {course.course_code} {course.title}\nAssignment: {title}\n",
                )
                sub = Submission(assignment_id=a.id, student_id=student.id,
                                 file_url=path, submitted_at=min(sub_time, now),
                                 status=sub_status)
                db.add(sub)
                db.flush()

                if RNG.random() < grade_ratio:
                    sub.grade = round(RNG.uniform(45, 99), 0)
                    sub.feedback = RNG.choice(FEEDBACK_POOL)
                    sub.status = "graded"
            db.commit()
    print(f"assignments ensured: {len(assignments)}")

    # ── Attendance sessions + records ─────────────────────
    for course in courses:
        existing_session = db.query(AttendanceSession).filter(
            AttendanceSession.course_id == course.id,
        ).first()
        if existing_session:
            continue
        enrolled = students_by_sem[course.semester]
        for s_idx in range(9):
            session_date = (date.today() - timedelta(days=7 * (s_idx + 1) + (course.semester % 3)))
            session = AttendanceSession(
                course_id=course.id, teacher_id=course.teacher_id,
                session_date=session_date,
                start_time=time(9, 0) if s_idx % 2 == 0 else time(11, 0),
                topic=f"Session {s_idx + 1}: {course.title} — Topic {s_idx + 1}",
                created_at=datetime.utcnow() - timedelta(days=7 * (s_idx + 1)),
            )
            db.add(session)
            db.flush()
            for student in enrolled:
                r = RNG.random()
                status = "present" if r < 0.8 else ("late" if r < 0.9 else "absent")
                db.add(AttendanceRecord(
                    session_id=session.id, student_id=student.id,
                    status=status,
                    marked_at=datetime.utcnow() - timedelta(days=7 * (s_idx + 1)),
                ))
        db.commit()
    print("attendance sessions/records seeded")

    # ── Quizzes ───────────────────────────────────────────
    for course in courses:
        for qi in range(2):
            title = f"{course.title} — Quiz {qi + 1}"
            existing = db.query(Quiz).filter(
                Quiz.course_id == course.id, Quiz.title == title,
            ).first()
            if existing:
                continue
            quiz = Quiz(course_id=course.id, teacher_id=course.teacher_id, title=title,
                        description=f"Short quiz on {course.title}.",
                        time_limit=15 if qi == 0 else None,
                        created_at=datetime.utcnow() - timedelta(days=10 + qi + course.semester))
            db.add(quiz)
            db.flush()
            items = list(QUIZ_QUESTIONS)
            RNG.shuffle(items)
            chosen = items[:5]
            for oi, (text, options, correct) in enumerate(chosen):
                if oi == 0:
                    text = f"Which of the following is the main focus of {course.title}?"
                    options = [f"{course.title} concepts", "Unrelated topics",
                               "General history", "None of these"]
                    correct = 0
                import json as _json
                db.add(QuizQuestion(quiz_id=quiz.id, text=text,
                                    options=_json.dumps(options),
                                    correct_index=correct, order_index=oi))
        db.commit()
    print("quizzes seeded")

    # ── Results (file entries: result + best + worst) ─────
    result_added = 0
    for course in courses:
        labels = [("midterm", "Mid-Term Result"), ("final", "Final Result"),
                  ("complete", "Complete Result")]
        enrolled = students_by_sem[course.semester]
        for exam_type, label in labels:
            title = f"{course.title} — {label}"
            existing = db.query(Result).filter(
                Result.course_id == course.id, Result.title == title,
            ).first()
            if existing:
                continue
            rows = [("Roll Number", "Student Name", "Marks Obtained")]
            for s in enrolled:
                profile = next((p for p in db.query(StudentProfile).filter(
                    StudentProfile.user_id == s.id).all()), None)
                roll = profile.roll_number if profile else ""
                name = f"{s.first_name} {s.last_name}"
                marks = RNG.randint(35, 100) if exam_type == "midterm" else RNG.randint(40, 100)
                rows.append((roll, name, str(marks)))
            csv_content = "\n".join(",".join(row) for row in rows) + "\n"
            csv_name = _unique_filename("csv")
            csv_path = _write_upload_file("results", csv_name, csv_content)

            best_name = _unique_filename("txt")
            best_path = _write_upload_file(
                "results", best_name,
                f"Best paper preview — {course.title} ({label})\nMarked by the course teacher as the top attempt.\n")
            worst_name = _unique_filename("txt")
            worst_path = _write_upload_file(
                "results", worst_name,
                f"Worst paper preview — {course.title} ({label})\nShown here for reference and improvement guidance.\n")

            db.add(Result(
                course_id=course.id, title=title, exam_type=exam_type,
                entry_type="file", content=None,
                file_url=csv_path, file_name=csv_name,
                worst_paper_url=worst_path, worst_paper_name=worst_name,
                best_paper_url=best_path, best_paper_name=best_name,
                uploaded_by=course.teacher_id,
                created_at=datetime.utcnow() - timedelta(days=20 + (course.semester % 4) * 2),
            ))
            result_added += 1
        db.commit()
    print(f"results added: {result_added}")

    # ── Study materials ───────────────────────────────────
    material_added = 0
    for course in courses:
        for kind, title in (("notes", f"{course.title} — Lecture Notes"),
                            ("slides", f"{course.title} — Slides")):
            existing = db.query(StudyMaterial).filter(
                StudyMaterial.course_id == course.id, StudyMaterial.title == title,
            ).first()
            if existing:
                continue
            fname = _unique_filename("txt")
            fpath = _write_upload_file(
                "materials", fname,
                f"Sample {kind} for {course.title}.\nSummary notes for BSCS semester {course.semester}.\n")
            db.add(StudyMaterial(title=title,
                                 description=f"Reading material for {course.title}.",
                                 category=kind, file_url=fpath, file_name=fname,
                                 course_id=course.id, uploaded_by=course.teacher_id,
                                 created_at=datetime.utcnow() - timedelta(days=25 + course.semester)))
            material_added += 1
        db.commit()
    print(f"materials added: {material_added}")

    # ── Notices ───────────────────────────────────────────
    notice_added = 0
    for i, (title, content, category, pinned, _) in enumerate(NOTICES):
        existing = db.query(Notice).filter(Notice.title == title).first()
        if existing:
            continue
        db.add(Notice(
            title=title, content=content, category=category,
            posted_by=admin.id, target_semester=(None if pinned else (3, 5, 7)[i % 3]),
            is_pinned=pinned, expires_at=datetime.utcnow() + timedelta(days=1),
            created_at=datetime.utcnow() - timedelta(days=i),
        ))
        notice_added += 1
    db.commit()
    print(f"notices added: {notice_added}")

    # ── Reviews ───────────────────────────────────────────
    review_added = 0
    for i, (rating, text) in enumerate(REVIEWS):
        student = all_students[i]
        existing = db.query(Review).filter(
            Review.user_id == student.id, Review.text == text,
        ).first()
        if existing:
            continue
        db.add(Review(user_id=student.id, rating=rating, text=text,
                      is_approved=True,
                      created_at=datetime.utcnow() - timedelta(days=5 + i)))
        review_added += 1
    db.commit()
    print(f"reviews added: {review_added}")

    # ── Summary ───────────────────────────────────────────
    print("\n=== SEED SUMMARY ===")
    print(f"teachers : {db.query(User).filter(User.role_id == teacher_role.id).count()}")
    print(f"students : {db.query(User).filter(User.role_id == student_role.id).count()}")
    print(f"courses  : {db.query(Course).count()}")
    print(f"enrollments: {db.query(Enrollment).count()}")
    print(f"assignments: {db.query(Assignment).count()}")
    print(f"submissions: {db.query(Submission).count()}")
    print(f"sessions : {db.query(AttendanceSession).count()}")
    print(f"records  : {db.query(AttendanceRecord).count()}")
    print(f"quizzes  : {db.query(Quiz).count()}")
    print(f"quiz questions: {db.query(QuizQuestion).count()}")
    print(f"results  : {db.query(Result).count()}")
    print(f"materials: {db.query(StudyMaterial).count()}")
    print(f"notices  : {db.query(Notice).count()}")
    print(f"reviews  : {db.query(Review).count()}\n")
    print("All dummy accounts password: password123")
    print("Sample logins -> teacher1@lms.test | s301@student.lms.test (semester 3)")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()