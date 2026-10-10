"""Parse question-bank files (docx / csv / xlsx) into MCQ question dicts.

Each parsed question is: {"text": str, "options": [str, ...], "correct": int}

Supported formats
-----------------
CSV / XLSX (first row may be a header):
    Question,Option A,Option B,Option C,Option D,Answer
    What is 2+2?,3,4,5,6,B
    - "Answer" may be a letter (A-D/a-d), a 1-based number, or the option text.
    - Header names are matched loosely (question/q, option1..4/a..d, answer/correct).
    - Without a header, columns are assumed to be: Q, Opt1, Opt2, Opt3, Opt4, Answer.

DOCX / TXT-style text:
    1. What is 2+2?
    a) 3
    b) 4
    c) 5
    d) 6
    Answer: b
    - Question lines start with "1." / "Q1." / "1)" etc., or end with "?".
    - Option lines start with "a)" / "A." / "(a)" / "1)" / "- ".
    - Answer lines start with "Answer:" / "Ans:" / "Correct:" / "Key:".
"""

import csv
import io
import re
import zipfile
from xml.etree import ElementTree as ET

from fastapi import HTTPException

_HEADER_QUESTION = {"question", "q", "ques", "text", "mcq", "statement"}
_HEADER_ANSWER = {"answer", "answers", "correct", "correct_answer", "key", "solution", "ans"}
_OPTION_LETTERS = "abcdef"


class QuestionParseError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


# ── Shared helpers ──────────────────────────────────────────────

def _normalize_correct(value, options):
    """Turn a raw answer cell (letter / number / text) into an option index."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    # Letter: "b", "B", "(b)", "b)"
    m = re.fullmatch(r"[\(\[]?([a-fA-F])[\)\]\.\)]?", s)
    if m and len(options) >= 2:
        idx = _OPTION_LETTERS.index(m.group(1).lower())
        if idx < len(options):
            return idx
    # Number: "2" → 1-based; "0" → already 0-based
    if re.fullmatch(r"\d+", s):
        n = int(s)
        if n == 0:
            return 0 if options else None
        if 1 <= n <= len(options):
            return n - 1
        return None
    # Match by option text
    low = s.lower()
    for i, opt in enumerate(options):
        if opt.strip().lower() == low:
            return i
    return None


def _build_question(text, options, correct_raw):
    """Validate and assemble one question dict, or return None if unusable."""
    text = (text or "").strip()
    options = [str(o).strip() for o in (options or []) if str(o).strip()]
    if not text or len(options) < 2:
        return None
    correct = _normalize_correct(correct_raw, options)
    if correct is None:
        return None
    return {"text": text, "options": options, "correct": correct}


# ── CSV / XLSX (tabular) ────────────────────────────────────────

def _is_header_row(row):
    cells = [str(c).strip().lower() for c in row if c is not None]
    if not cells:
        return False
    return any(c in _HEADER_QUESTION for c in cells) or any(c in _HEADER_ANSWER for c in cells)


def _parse_tabular_rows(rows):
    rows = [list(r) for r in rows if any(str(c).strip() for c in r if c is not None)]
    if not rows:
        raise QuestionParseError("The file is empty.")

    header_map = None
    if _is_header_row(rows[0]):
        header = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
        q_idx = a_idx = None
        opt_idx = {}
        for i, name in enumerate(header):
            if name in _HEADER_QUESTION and q_idx is None:
                q_idx = i
            elif name in _HEADER_ANSWER and a_idx is None:
                a_idx = i
            else:
                m = re.fullmatch(r"(?:option|opt|choice)?\s*([a-f]|\d+)", name)
                if m:
                    key = m.group(1).lower()
                    letter = key if key.isalpha() else _OPTION_LETTERS[int(key) - 1] if int(key) <= 6 else None
                    if letter:
                        opt_idx.setdefault(letter, i)
        if q_idx is None:
            q_idx = 0
        header_map = {"q": q_idx, "a": a_idx, "opts": opt_idx}
        rows = rows[1:]

    questions = []
    for row in rows:
        def cell(i):
            return row[i] if i is not None and i < len(row) else None

        if header_map:
            text = cell(header_map["q"])
            opts = [cell(header_map["opts"].get(letter)) for letter in _OPTION_LETTERS
                    if header_map["opts"].get(letter) is not None]
            correct_raw = cell(header_map["a"])
        else:
            # No header: Q, Opt1..Opt4, Answer (extra option columns beyond 6 are ignored)
            text = cell(0)
            opts = [cell(i) for i in range(1, min(len(row) - 1, 7))]
            correct_raw = cell(len(row) - 1) if len(row) > 1 else None

        q = _build_question(text, opts, correct_raw)
        if q:
            questions.append(q)

    return questions


def parse_csv(content: bytes):
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    reader = csv.reader(io.StringIO(text))
    return _parse_tabular_rows(list(reader))


def parse_xlsx(content: bytes):
    try:
        import openpyxl
    except ImportError:
        raise QuestionParseError("openpyxl is not installed — run: pip install openpyxl")
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    try:
        ws = wb.active
        rows = [list(r) for r in ws.iter_rows(values_only=True)]
    finally:
        wb.close()
    return _parse_tabular_rows(rows)


# ── DOCX (text-structured) ──────────────────────────────────────

_DOCX_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

_RE_QUESTION = re.compile(r"^\s*(?:q(?:uestion)?\s*)?(\d+)\s*[.)\-:]\s*(.+)$", re.IGNORECASE)
_RE_OPTION = re.compile(r"^\s*(?:[\(\[]?([a-f])[\)\]]?|[A-F]|(?:opt(?:ion)?|choice)\s*(\d)|(\d+))\s*[.)\-:]\s*(.+)$", re.IGNORECASE)
_RE_ANSWER = re.compile(r"^\s*(?:answer|ans|correct|key|solution)\s*[.:\-]?\s*(.+)$", re.IGNORECASE)


def _docx_paragraphs(content: bytes):
    """Extract paragraph texts from a .docx using only the stdlib."""
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        try:
            xml = zf.read("word/document.xml")
        except KeyError:
            raise QuestionParseError("Not a valid .docx file (word/document.xml missing).")
    root = ET.fromstring(xml)
    paras = []
    for p in root.iter(f"{_DOCX_NS}p"):
        text = "".join(t.text or "" for t in p.iter(f"{_DOCX_NS}t"))
        paras.append(text.strip())
    return paras


def parse_docx(content: bytes):
    paragraphs = _docx_paragraphs(content)
    questions = []

    text, options, correct = None, [], None

    def flush():
        nonlocal text, options, correct
        q = _build_question(text, options, correct)
        if q:
            questions.append(q)
        text, options, correct = None, [], None

    for para in paragraphs:
        line = para.strip()
        if not line:
            continue

        m_ans = _RE_ANSWER.match(line)
        if m_ans and text is not None:
            correct = m_ans.group(1).strip()
            flush()
            continue

        m_opt = _RE_OPTION.match(line)
        if m_opt and text is not None and not _RE_QUESTION.match(line):
            options.append(m_opt.group(4).strip())
            continue

        m_q = _RE_QUESTION.match(line)
        if m_q:
            flush()
            text = m_q.group(2).strip()
            continue

        # Continuation lines: append to options if we're mid-question and already have text
        if text is not None and options and not options[-1].endswith((".", "?", "!")):
            options[-1] = f"{options[-1]} {line}".strip()
        elif text is not None and not options:
            text = f"{text} {line}".strip()
        elif text is None and line.endswith("?"):
            flush()
            text = line

    flush()

    # Fallback: no numbered structure — split on blank-ish patterns of Q?/options
    if not questions:
        raise QuestionParseError(
            "No questions found. DOCX files must use numbered questions "
            "(e.g. \"1. What is ...?\"), lettered options (a) ... d)), and an \"Answer:\" line."
        )
    return questions


# ── Entry point ─────────────────────────────────────────────────

def parse_question_file(filename: str, content: bytes):
    """Parse an uploaded question-bank file. Returns a list of question dicts."""
    name = (filename or "").lower()
    if name.endswith(".csv"):
        questions = parse_csv(content)
    elif name.endswith(".xlsx") or name.endswith(".xls"):
        questions = parse_xlsx(content)
    elif name.endswith(".docx"):
        questions = parse_docx(content)
    else:
        raise QuestionParseError(
            f"Unsupported file type '{filename}'. Upload .docx, .csv, or .xlsx."
        )

    if not questions:
        raise QuestionParseError(
            "No valid questions found in the file. Expected columns "
            "Question, Option1..Option4, Answer (CSV/XLSX) or numbered DOCX questions."
        )
    return questions
