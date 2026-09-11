import calendar
from datetime import date, datetime
from calendar import month_name

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

from sqlalchemy.orm import Session

from app.models import (
    User, Course, StudentProfile,
    AttendanceSession, AttendanceRecord,
)
from app.routers.courses import student_has_access


def generate_attendance_excel(
    db: Session,
    course_id: str,
    teacher: User,
    year: int,
    month: int,
) -> Workbook:
    """Generate an attendance Excel workbook for a course and month."""

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise ValueError("Course not found")

    # Get students who have access to this course (session+semester match)
    all_profiles = db.query(StudentProfile).filter(
        StudentProfile.semester == course.semester,
        StudentProfile.enrollment_year.isnot(None),
    ).all()

    students = []
    all_user_ids = {sp.user_id for sp in all_profiles}
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(all_user_ids)).all()} if all_user_ids else {}
    for sp in all_profiles:
        user = users_map.get(sp.user_id)
        if user and student_has_access(db, user, course):
            students.append({
                "user": user,
                "profile": sp,
                "roll_number": sp.roll_number if sp else "",
                "name": f"{user.first_name} {user.last_name}".strip(),
            })

    # Sort by roll number
    students.sort(key=lambda s: s["roll_number"] or "zzz")

    # Get all attendance sessions for this course in the given month
    month_start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    month_end = date(year, month, last_day)

    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
        AttendanceSession.session_date >= month_start,
        AttendanceSession.session_date <= month_end,
    ).all()

    # Build a map: student_id -> { day -> status }
    attendance_map = {}
    session_ids = [s.id for s in sessions]
    all_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id.in_(session_ids),
    ).all() if session_ids else []
    session_date_map = {s.id: s.session_date.day for s in sessions}
    for r in all_records:
        day = session_date_map.get(r.session_id)
        if day is not None:
            if r.student_id not in attendance_map:
                attendance_map[r.student_id] = {}
            attendance_map[r.student_id][day] = r.status

    # ── Create workbook ──
    wb = Workbook()
    ws = wb.active
    ws.title = course.title[:31]  # Excel sheet name max 31 chars

    # ── Styles ──
    header_font = Font(name="Calibri", bold=True, size=12)
    title_font = Font(name="Calibri", bold=True, size=14)
    college_font = Font(name="Calibri", bold=True, size=16)
    normal_font = Font(name="Calibri", size=11)
    small_font = Font(name="Calibri", size=9)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font_white = Font(name="Calibri", bold=True, size=10, color="FFFFFF")
    present_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
    absent_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
    late_fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")

    # Days in month
    days_in_month = calendar.monthrange(year, month)[1]

    # Total columns: S.No + Roll No + Name + 30 days + P + A + L + Total + %
    total_cols = 3 + days_in_month + 5  # 3 header cols + days + 5 summary cols

    # ── Row 1: College name (merged) ──
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
    cell = ws.cell(row=1, column=1, value="Govt. Graduate College Burewala")
    cell.font = college_font
    cell.alignment = center_align

    # ── Row 2: Attendance Report title ──
    month_label = month_name[month]
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=total_cols)
    cell = ws.cell(row=2, column=1, value=f"Attendance Report for the month of {month_label} {year}")
    cell.font = title_font
    cell.alignment = center_align

    # ── Row 3: Semester info ──
    sem = course.semester or "?"
    start_year = year - (sem - 1) // 2
    end_year = start_year + 4
    ws.merge_cells(start_row=3, start_column=1, end_row=3, end_column=total_cols)
    cell = ws.cell(row=3, column=1, value=f"BSCS Semester - {sem}({start_year}-{end_year})")
    cell.font = header_font
    cell.alignment = center_align

    # ── Row 4: Month ──
    ws.merge_cells(start_row=4, start_column=1, end_row=4, end_column=total_cols)
    cell = ws.cell(row=4, column=1, value=f"Month: {month_label} {year}")
    cell.font = header_font
    cell.alignment = center_align

    # ── Row 5: Total Classes ──
    total_classes = len(sessions)
    ws.merge_cells(start_row=5, start_column=1, end_row=5, end_column=total_cols)
    cell = ws.cell(row=5, column=1, value=f"Total Classes: {total_classes}")
    cell.font = header_font
    cell.alignment = center_align

    # ── Row 6: Empty ──
    row = 6

    # ── Row 7: Headers ──
    header_row = 7
    headers = ["S.No", "Roll No", "Name"]
    for d in range(1, days_in_month + 1):
        dt = date(year, month, d)
        headers.append(f"{month_label[:3]} {d}")
    headers.extend(["P", "A", "L", "Total", "%"])

    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col_idx, value=header)
        cell.font = header_font_white
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = thin_border

    # ── Row 8: Day of week ──
    day_row = 8
    day_abbr = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

    ws.cell(row=day_row, column=1, value="").border = thin_border
    ws.cell(row=day_row, column=2, value="").border = thin_border
    ws.cell(row=day_row, column=3, value="").border = thin_border

    for d in range(1, days_in_month + 1):
        dt = date(year, month, d)
        day_name = day_abbr[dt.weekday()]
        cell = ws.cell(row=day_row, column=3 + d, value=day_name)
        cell.font = small_font
        cell.alignment = center_align
        cell.border = thin_border

    # Summary columns in day row
    for offset, label in enumerate(["", "", "", "", ""]):
        col = 3 + days_in_month + 1 + offset
        cell = ws.cell(row=day_row, column=col, value="")
        cell.border = thin_border

    # ── Student rows ──
    for idx, student in enumerate(students):
        data_row = header_row + 2 + idx  # skip header row + day row
        sid = student["user"].id

        # S.No
        cell = ws.cell(row=data_row, column=1, value=idx + 1)
        cell.font = normal_font
        cell.alignment = center_align
        cell.border = thin_border

        # Roll No
        cell = ws.cell(row=data_row, column=2, value=student["roll_number"] or "")
        cell.font = normal_font
        cell.alignment = center_align
        cell.border = thin_border

        # Name
        cell = ws.cell(row=data_row, column=3, value=student["name"])
        cell.font = normal_font
        cell.alignment = left_align
        cell.border = thin_border

        # Daily attendance
        present_count = 0
        absent_count = 0
        late_count = 0

        for d in range(1, days_in_month + 1):
            col = 3 + d
            status = attendance_map.get(sid, {}).get(d, None)
            cell = ws.cell(row=data_row, column=col)
            cell.alignment = center_align
            cell.border = thin_border
            cell.font = normal_font

            if status == "present":
                cell.value = "P"
                cell.fill = present_fill
                present_count += 1
            elif status == "late":
                cell.value = "L"
                cell.fill = late_fill
                late_count += 1
            elif status == "absent":
                cell.value = "A"
                cell.fill = absent_fill
                absent_count += 1
            else:
                cell.value = ""

        # Summary columns
        summary_start = 3 + days_in_month + 1
        total = present_count + late_count + absent_count
        pct = f"{round(present_count / total * 100)}%" if total > 0 else "0%"

        for col_offset, val in enumerate([present_count, absent_count, late_count, total, pct]):
            cell = ws.cell(row=data_row, column=summary_start + col_offset, value=val)
            cell.font = normal_font
            cell.alignment = center_align
            cell.border = thin_border

    # ── Column widths ──
    ws.column_dimensions[get_column_letter(1)].width = 6    # S.No
    ws.column_dimensions[get_column_letter(2)].width = 12   # Roll No
    ws.column_dimensions[get_column_letter(3)].width = 22   # Name
    for d in range(1, days_in_month + 1):
        ws.column_dimensions[get_column_letter(3 + d)].width = 5  # Day columns
    # Summary columns
    for offset in range(5):
        ws.column_dimensions[get_column_letter(3 + days_in_month + 1 + offset)].width = 6

    return wb
