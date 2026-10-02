"""VidShare 소개 PPT 생성기.

코드 리뷰용이 아니라 **서비스 소개**용 덱이다. 화면 스크린샷이 주인공이고,
API 목록·파일 구조 같은 구현 디테일은 담지 않는다(그건 portfolio/site 쪽 몫).

    pip install python-pptx    # 최초 1회
    python portfolio/build_pptx.py

슬라이드 내용은 이 파일 안 데이터(리스트/튜플)로 정의한다. 문구를 고치려면
아래 SLIDES 관련 함수 호출부만 건드리면 된다 — 레이아웃 코드는 그대로 두고.
"""

from __future__ import annotations

import struct
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt, Emu

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "site/assets/screenshots"
OUT = ROOT / "VidShare-포트폴리오.pptx"

# ---------------------------------------------------------------- 팔레트

INK = RGBColor(0x0D, 0x12, 0x20)       # 가장 어두운 배경 (커버·구분 슬라이드)
INK_2 = RGBColor(0x15, 0x1D, 0x31)     # 어두운 배경 위 카드
INK_LINE = RGBColor(0x27, 0x31, 0x4a)  # 어두운 배경 위 선

PAPER = RGBColor(0xFF, 0xFF, 0xFF)
PAPER_2 = RGBColor(0xF6, 0xF7, 0xFB)
PAPER_3 = RGBColor(0xEC, 0xEF, 0xF6)
LINE = RGBColor(0xDF, 0xE4, 0xEE)

TEXT = RGBColor(0x10, 0x16, 0x23)
TEXT_2 = RGBColor(0x2C, 0x36, 0x46)
MUTED = RGBColor(0x5F, 0x6B, 0x7F)
MUTED_ON_DARK = RGBColor(0xB9, 0xC2, 0xD6)
FAINT_ON_DARK = RGBColor(0x8b, 0x96, 0xb5)

BRAND = RGBColor(0x4F, 0x46, 0xE5)
BRAND_2 = RGBColor(0x7C, 0x3A, 0xED)
BLUE = RGBColor(0x3E, 0xA6, 0xFF)
AMBER = RGBColor(0xF2, 0x9A, 0x1E)      # 다크 배경용 밝은 앰버
AMBER_INK = RGBColor(0xB4, 0x53, 0x09)  # 밝은 배경용 앰버
TEAL = RGBColor(0x14, 0xB8, 0xA6)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

FONT = "맑은 고딕"

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


# ---------------------------------------------------------------- 저수준 헬퍼

def png_size(name: str) -> tuple[int, int]:
    head = (SHOTS / name).read_bytes()[:26]
    w, h = struct.unpack(">II", head[16:24])
    return w, h


def new_slide(prs: Presentation, bg: RGBColor):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = bg
    return slide


def set_alpha(shape, pct: float) -> None:
    """도형 채우기를 반투명하게. pct=100 이면 완전 불투명, 0이면 완전 투명."""
    srgb = shape.fill.fore_color._xFill
    for old in srgb.findall(qn("a:alpha")):
        srgb.remove(old)
    alpha = srgb.makeelement(qn("a:alpha"), {"val": str(int(pct * 1000))})
    srgb.append(alpha)


def rect(slide, x, y, w, h, fill=None, line=None, line_w=0.75, radius=None, shadow=False):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius is not None else MSO_SHAPE.RECTANGLE
    sp = slide.shapes.add_shape(shape_type, x, y, w, h)
    if radius is not None:
        try:
            sp.adjustments[0] = radius
        except IndexError:
            pass
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid()
        sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(line_w)
    sp.shadow.inherit = False
    if shadow:
        # `shadow.inherit = False` 위에서 이미 빈 <a:effectLst/> 하나를 심어 뒀다.
        # 여기서 새 <a:effectLst> 를 또 append 하면 같은 부모 안에 두 개가 생겨
        # OOXML 스키마 위반이 된다 — python-pptx/파이썬 파서는 눈감아 주지만
        # 실제 PowerPoint는 "파일을 열 수 없습니다"로 거부한다. 기존 것을 채운다.
        el = sp._element.spPr
        effect = el.find(qn("a:effectLst"))
        if effect is None:
            effect = el.makeelement(qn("a:effectLst"), {})
            el.append(effect)
        sh = effect.makeelement(
            qn("a:outerShdw"),
            {"blurRad": "90000", "dist": "30000", "dir": "5400000", "rotWithShape": "0"},
        )
        clr = effect.makeelement(qn("a:srgbClr"), {"val": "10162E"})
        alpha = effect.makeelement(qn("a:alpha"), {"val": "22000"})
        clr.append(alpha)
        sh.append(clr)
        effect.append(sh)
    return sp


def oval(slide, x, y, w, h, fill, alpha_pct=100):
    sp = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, w, h)
    sp.fill.solid()
    sp.fill.fore_color.rgb = fill
    sp.line.fill.background()
    sp.shadow.inherit = False
    if alpha_pct < 100:
        set_alpha(sp, alpha_pct)
    return sp


def text(
    slide, x, y, w, h, s,
    size=18, color=TEXT, bold=False, align=PP_ALIGN.LEFT,
    anchor=MSO_ANCHOR.TOP, line_spacing=1.2, font=FONT, spacing_after=0,
):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    lines = s.split("\n") if isinstance(s, str) else s
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        if spacing_after:
            p.space_after = Pt(spacing_after)
        _run(p, line, size, color, bold, font)
    return box


def _run(p, s, size, color, bold, font):
    run = p.add_run()
    run.text = s
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font
    rpr = run._r.get_or_add_rPr()
    rpr.set("lang", "ko-KR")
    ea = rpr.makeelement(qn("a:ea"), {"typeface": font})
    rpr.append(ea)
    return run


def rich(slide, x, y, w, h, parts, size=15, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.3):
    """parts: [(text, color, bold), ...] 한 문단 안에서 색·굵기를 섞어 쓸 때."""
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    for chunk, color, bold in parts:
        _run(p, chunk, size, color, bold, FONT)
    return box


def kicker(slide, s, x=Inches(0.9), y=Inches(0.5), color=BRAND, on_dark=False):
    c = BLUE if on_dark else color
    text(slide, x, y, Inches(9), Inches(0.4), s, size=13, color=c, bold=True)


def page_no(slide, n, dark=False):
    color = FAINT_ON_DARK if dark else MUTED
    text(
        slide, SLIDE_W - Inches(1.0), SLIDE_H - Inches(0.5), Inches(0.7), Inches(0.35),
        f"{n:02d}", size=11, color=color, align=PP_ALIGN.RIGHT,
    )
    text(
        slide, Inches(0.5), SLIDE_H - Inches(0.5), Inches(4), Inches(0.35),
        "VidShare", size=11, color=color, bold=True,
    )


def fit_size(name, max_w, max_h):
    """상자 안에 종횡비를 유지하며 맞췄을 때의 (width, height)만 계산한다."""
    iw, ih = png_size(name)
    ratio = min(max_w / iw, max_h / ih)
    return int(iw * ratio), int(ih * ratio)


def picture_fit(slide, name, x, y, max_w, max_h):
    """스크린샷을 종횡비 유지한 채 상자 안 가운데에 놓는다."""
    w, h = fit_size(name, max_w, max_h)
    px = x + (max_w - w) // 2
    py = y + (max_h - h) // 2
    pic = slide.shapes.add_picture(str(SHOTS / name), px, py, width=w, height=h)
    return pic, px, py, w, h


def browser_frame(slide, name, x, y, max_w, max_h, bar=True):
    """브라우저 창처럼 상단 바 + 테두리를 두르고 그 안에 스크린샷을 넣는다."""
    bar_h = Inches(0.32) if bar else 0
    w, h = fit_size(name, max_w, max_h - bar_h)
    px = x + (max_w - w) // 2
    py = y + bar_h + (max_h - bar_h - h) // 2
    frame_y = py - bar_h
    frame = rect(slide, px, frame_y, w, h + bar_h, fill=PAPER, line=LINE, line_w=1, radius=0.04, shadow=True)
    frame.line.color.rgb = LINE
    if bar:
        dots_y = frame_y + Inches(0.12)
        for i, c in enumerate([RGBColor(0xFF, 0x5F, 0x57), RGBColor(0xFE, 0xBC, 0x2E), RGBColor(0x28, 0xC8, 0x40)]):
            oval(slide, px + Inches(0.14) + Inches(0.16) * i, dots_y, Inches(0.09), Inches(0.09), c)
    slide.shapes.add_picture(str(SHOTS / name), px, py, width=w, height=h)
    return px, frame_y, w, h + bar_h


def phone_frame(slide, name, x, y, max_w, max_h):
    """세로 영상 화면(쇼츠)은 브라우저보다 폰 목업이 실제 사용 모습에 가깝다."""
    bez = Inches(0.09)
    w, h = fit_size(name, max_w - bez * 2, max_h - bez * 2)
    px = x + (max_w - w) // 2
    py = y + (max_h - h) // 2
    rect(slide, px - bez, py - bez, w + bez * 2, h + bez * 2, fill=INK, radius=0.09, shadow=True)
    slide.shapes.add_picture(str(SHOTS / name), px, py, width=w, height=h)
    return px, py, w, h


def bg_glow(slide):
    """커버·섹션 구분 슬라이드용 은은한 보라/파랑 광원."""
    oval(slide, Inches(-3.2), Inches(-3.6), Inches(9), Inches(9), BRAND_2, alpha_pct=22)
    oval(slide, Inches(8.6), Inches(-2.4), Inches(7.5), Inches(7.5), BLUE, alpha_pct=16)


def pill(slide, s, x, y, w, h, fill, text_color, size=11.5):
    p = rect(slide, x, y, w, h, fill=fill, radius=0.5)
    tf = p.text_frame
    tf.word_wrap = False
    tf.margin_left = tf.margin_right = Pt(2)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    para = tf.paragraphs[0]
    para.alignment = PP_ALIGN.CENTER
    _run(para, s, size, text_color, True, FONT)
    return p


def tag_row(slide, tags, x, y, fill, text_color, h=Inches(0.36), gap=Inches(0.12), size=11.5):
    cx = x
    for t in tags:
        w = Inches(0.16 + 0.105 * len(t))
        pill(slide, t, cx, y, w, h, fill, text_color, size=size)
        cx = cx + w + gap


# ---------------------------------------------------------------- 섹션 구분 슬라이드

def section_slide(prs, no, label, title, sub, n):
    # 이 덱의 섹션 타이틀은 전부 두 줄(\n 포함)이다. 부제목 위치는
    # "제목이 두 줄"을 전제로 고정한다 — 한 줄로 줄면 위가 비고, 세 줄이면
    # 넘치므로 title 문구를 조정할 것이지 여기 좌표를 조정하지 않는다.
    s = new_slide(prs, INK)
    bg_glow(s)
    text(s, Inches(0.9), Inches(2.4), Inches(2), Inches(0.5), f"{no:02d}", size=22, color=BLUE, bold=True)
    text(s, Inches(0.9), Inches(2.9), Inches(11.5), Inches(0.5), label, size=15, color=MUTED_ON_DARK, bold=True)
    text(s, Inches(0.9), Inches(3.35), Inches(11.5), Inches(1.75), title, size=40, color=WHITE, bold=True, line_spacing=1.15)
    if sub:
        text(s, Inches(0.9), Inches(5.15), Inches(10.8), Inches(1.0), sub, size=16, color=MUTED_ON_DARK, line_spacing=1.5)
    page_no(s, n, dark=True)
    return s


# ================================================================== 빌드

def build():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    n = 0

    def nn():
        nonlocal n
        n += 1
        return n

    # ---------------------------------------------------------- 01. 커버
    s = new_slide(prs, INK)
    bg_glow(s)
    oval(s, Inches(0.9), Inches(0.75), Inches(0.5), Inches(0.5), BRAND, alpha_pct=100)
    text(s, Inches(0.9), Inches(0.75), Inches(0.5), Inches(0.5), "V", size=20, color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, Inches(1.55), Inches(0.75), Inches(3), Inches(0.5), "VidShare", size=20, color=WHITE, bold=True,
         anchor=MSO_ANCHOR.MIDDLE)

    text(s, Inches(0.9), Inches(2.55), Inches(9), Inches(0.5),
         "풀스택 개인 프로젝트 · 2026.08 – 2026.10", size=14, color=BLUE, bold=True)
    text(s, Inches(0.85), Inches(3.05), Inches(11.6), Inches(2.0),
         "영상을 올리고, 함께 보고,\n운영까지 하는 플랫폼",
         size=46, color=WHITE, bold=True, line_spacing=1.12)
    text(s, Inches(0.9), Inches(4.75), Inches(9.6), Inches(1.1),
         "숏폼 · 롱폼 · 커뮤니티 · 실시간 메시지 · AI 챗봇을 한 서비스에 담고,\n"
         "신고 처리와 계정 관리를 위한 관리자 콘솔까지 별도 앱으로 만들었습니다.",
         size=15.5, color=MUTED_ON_DARK, line_spacing=1.5)

    stats = [("3", "애플리케이션"), ("82", "REST API"), ("22", "DB 테이블"), ("188", "테스트"), ("177", "커밋")]
    cx = Inches(0.9)
    cw = Inches(2.25)
    for label_n, label_t in stats:
        rect(s, cx, Inches(6.15), cw - Inches(0.15), Inches(0.95), fill=INK_2, line=INK_LINE, line_w=0.75, radius=0.12)
        text(s, cx + Inches(0.18), Inches(6.27), cw - Inches(0.4), Inches(0.5), label_n, size=22, color=WHITE, bold=True)
        text(s, cx + Inches(0.18), Inches(6.75), cw - Inches(0.4), Inches(0.3), label_t, size=10.5, color=FAINT_ON_DARK, bold=True)
        cx += cw
    page_no(s, nn(), dark=True)

    # ---------------------------------------------------------- 02. 목차
    s = new_slide(prs, PAPER)
    kicker(s, "CONTENTS")
    text(s, Inches(0.9), Inches(0.85), Inches(10), Inches(0.8), "무엇을 만들었는지 소개합니다", size=28, color=TEXT, bold=True)

    agenda = [
        ("01", "프로젝트 소개", "무엇이고, 왜 만들었는가"),
        ("02", "핵심 기능", "쇼츠부터 AI 챗봇까지"),
        ("03", "사용자 화면", "실제 서비스 화면 둘러보기"),
        ("04", "AI 챗봇", "3가지 모델, 대화 저장"),
        ("05", "관리자 콘솔", "신고·유저·콘텐츠 운영"),
        ("06", "기술 스택 & 규모", "무엇으로, 얼마나, 어디에서 운영하나"),
        ("07", "회고 & 다음 계획", "잘한 점과 앞으로의 방향"),
    ]
    # 7행 * step 을 footer(7.0in 시작) 위에서 끝내야 한다: 1.95 + 6*0.68 + 0.6 = 6.63in
    y = Inches(1.95)
    row_h, step = Inches(0.6), Inches(0.68)
    for no, title, desc in agenda:
        rect(s, Inches(0.9), y, Inches(11.5), row_h, fill=PAPER_2, radius=0.16)
        text(s, Inches(1.15), y, Inches(0.9), row_h, no, size=16, color=BRAND, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        text(s, Inches(2.05), y, Inches(3.6), row_h, title, size=15.5, color=TEXT, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        text(s, Inches(5.8), y, Inches(6.4), row_h, desc, size=13, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
        y += step
    page_no(s, nn())

    # ---------------------------------------------------------- 03. 프로젝트 소개
    section_slide(prs, 1, "PROJECT", "운영까지 넣으니\n설계할 것이 달라졌다", None, nn())

    s = new_slide(prs, PAPER)
    kicker(s, "01 · 프로젝트 소개")
    text(s, Inches(0.9), Inches(0.85), Inches(11), Inches(0.7), "왜 이 서비스를 만들었나", size=26, color=TEXT, bold=True)
    text(s, Inches(0.9), Inches(1.65), Inches(10.8), Inches(1.3),
         "영상 플레이어 하나를 만드는 과제로는 배울 것이 금방 끝납니다. 그래서 "
         "콘텐츠 소비 → 창작 → 소통 → 운영까지, 서비스가 실제로 도는 한 사이클을 전부 통과해 보기로 했습니다.",
         size=15.5, color=TEXT_2, line_spacing=1.55)

    rect(s, Inches(0.9), Inches(3.05), Inches(11.5), Inches(1.25), fill=RGBColor(0xF0, 0xEF, 0xFF), radius=0.08)
    rich(
        s, Inches(1.2), Inches(3.28), Inches(11), Inches(0.85),
        [
            ("운영을 범위에 넣은 것이 이 프로젝트의 성격을 결정했습니다.  ", TEXT_2, True),
            ("신고가 들어오면 누가 보고 무엇을 근거로 지우는지, 정지된 계정은 어떻게 되는지 — "
             "이런 질문은 사용자 화면만 만들어서는 마주칠 일이 없습니다.", TEXT_2, False),
        ],
        size=14.5, line_spacing=1.5,
    )

    cards = [
        ("소비", "쇼츠·롱폼 피드로\n영상을 본다"),
        ("창작", "직접 올리고\n커뮤니티에 공유한다"),
        ("소통", "댓글·메시지·알림으로\n서로 이어진다"),
        ("운영", "신고·정지·삭제로\n서비스를 관리한다"),
    ]
    cx = Inches(0.9)
    cw = Inches(2.85)
    for i, (label, desc) in enumerate(cards):
        rect(s, cx, Inches(4.75), cw - Inches(0.15), Inches(1.85), fill=PAPER_2, line=LINE, line_w=1, radius=0.1)
        pill(s, str(i + 1), cx + Inches(0.22), Inches(4.97), Inches(0.42), Inches(0.42), BRAND, WHITE, size=13)
        text(s, cx + Inches(0.22), Inches(5.5), cw - Inches(0.5), Inches(0.4), label, size=15, color=TEXT, bold=True)
        text(s, cx + Inches(0.22), Inches(5.92), cw - Inches(0.5), Inches(0.6), desc, size=11.5, color=MUTED, line_spacing=1.35)
        cx += cw
    page_no(s, nn())

    # ---------------------------------------------------------- 04. 서비스 구성
    s = new_slide(prs, PAPER)
    kicker(s, "01 · 프로젝트 소개")
    text(s, Inches(0.9), Inches(0.85), Inches(11), Inches(0.7), "세 개의 애플리케이션으로 구성", size=26, color=TEXT, bold=True)
    text(s, Inches(0.9), Inches(1.55), Inches(11), Inches(0.5),
         "사용자 웹앱과 관리자 콘솔을 별도 앱으로 분리하고, 하나의 API 서버가 둘을 함께 지원합니다.",
         size=14, color=MUTED)

    boxes = [
        (Inches(0.9), "사용자 웹앱", "FrontServer", "3000", BRAND, "숏폼·롱폼·커뮤니티\n메시지·알림·챗봇"),
        (Inches(5.05), "관리자 콘솔", "Console", "3200", AMBER_INK, "신고·유저·콘텐츠\n고객센터·대시보드"),
        (Inches(9.2), "API 서버", "BackendServer", "4000", TEAL, "REST API·PostgreSQL\n실시간(SSE·WS)"),
    ]
    bw = Inches(3.2)
    by = Inches(2.55)
    bh = Inches(2.5)
    for bx, title, sub, port, color, desc in boxes:
        rect(s, bx, by, bw, bh, fill=PAPER_2, line=LINE, line_w=1, radius=0.08)
        rect(s, bx, by, bw, Inches(0.12), fill=color, radius=0)
        text(s, bx + Inches(0.28), by + Inches(0.32), bw - Inches(0.5), Inches(0.45), title, size=17, color=TEXT, bold=True)
        text(s, bx + Inches(0.28), by + Inches(0.78), bw - Inches(0.5), Inches(0.35), f"{sub} · :{port}", size=11.5, color=MUTED, bold=True)
        text(s, bx + Inches(0.28), by + Inches(1.28), bw - Inches(0.5), Inches(1.0), desc, size=12.5, color=TEXT_2, line_spacing=1.5)

    # 화살표 (사용자앱 -> API, 콘솔 -> API)
    for x1 in (Inches(0.9) + bw // 2, Inches(5.05) + bw // 2):
        conn = s.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT, x1, by + bh, Inches(9.2) + bw // 2, by + bh + Inches(0.55)
        )
        conn.line.color.rgb = MUTED
        conn.line.width = Pt(1.25)

    rich(
        s, Inches(0.9), Inches(5.65), Inches(11.5), Inches(0.5),
        [("포인트  ", BRAND, True),
         ("두 프론트가 같은 백엔드를 보지만, 세션 쿠키 이름을 달리해 동시에 로그인해도 서로 영향이 없습니다.", TEXT_2, False)],
        size=13.5,
    )
    page_no(s, nn())

    # ---------------------------------------------------------- 05. 핵심 기능
    section_slide(prs, 2, "FEATURES", "쇼츠부터\nAI 챗봇까지", "여덟 가지 영역을 한 서비스 안에 담았습니다.", nn())

    s = new_slide(prs, PAPER)
    kicker(s, "02 · 핵심 기능")
    text(s, Inches(0.9), Inches(0.85), Inches(11), Inches(0.7), "기능 한눈에 보기", size=26, color=TEXT, bold=True)

    feats = [
        ("▶", "쇼츠 · 롱폼", "세로 스냅 피드, 좋아요·댓글, 실파일 업로드", BRAND),
        ("💬", "커뮤니티 · 소셜", "게시글 공유, 팔로우, 팔로잉 피드, 통합 검색", BRAND),
        ("⚡", "실시간", "SSE 알림, WebSocket 메시지", BRAND),
        ("🤖", "AI 챗봇", "3가지 모델 티어, 대화 저장, 파일 첨부", BRAND_2),
        ("🛡", "모더레이션", "신고·차단, 피드 자동 필터링", AMBER_INK),
        ("⚙", "운영 콘솔", "신고 처리·계정 정지·문의 답변", AMBER_INK),
        ("🔐", "인증", "이메일 없이 가입, 세션 기반 로그인", TEAL),
        ("📄", "법적 페이지", "이용약관·개인정보처리방침·사업자 정보", TEAL),
    ]
    cols, rows = 4, 2
    gw, gh = Inches(2.85), Inches(2.15)
    gx0, gy0 = Inches(0.9), Inches(1.75)
    for i, (icon, title, desc, color) in enumerate(feats):
        r, c = divmod(i, cols)
        x = gx0 + c * (gw + Inches(0.1))
        y = gy0 + r * (gh + Inches(0.15))
        rect(s, x, y, gw - Inches(0.1), gh - Inches(0.15), fill=PAPER_2, line=LINE, line_w=1, radius=0.1)
        oval(s, x + Inches(0.22), y + Inches(0.22), Inches(0.5), Inches(0.5), color, alpha_pct=14)
        text(s, x + Inches(0.22), y + Inches(0.22), Inches(0.5), Inches(0.5), icon, size=17,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        text(s, x + Inches(0.22), y + Inches(0.88), gw - Inches(0.5), Inches(0.4), title, size=14, color=TEXT, bold=True)
        text(s, x + Inches(0.22), y + Inches(1.28), gw - Inches(0.5), Inches(0.75), desc, size=11, color=MUTED, line_spacing=1.35)
    page_no(s, nn())

    # ---------------------------------------------------------- 06~09. 사용자 화면
    section_slide(prs, 3, "SCREENS", "실제 서비스\n화면입니다", "목업이 아니라 실행 중인 앱을 그대로 캡처했습니다.", nn())

    def screen_slide(kicker_txt, title, desc, shot, accent=BRAND, style="browser", tags=None):
        s = new_slide(prs, PAPER)
        kicker(s, kicker_txt, color=accent)
        text(s, Inches(0.9), Inches(0.78), Inches(5.3), Inches(0.65), title, size=24, color=TEXT, bold=True)
        text(s, Inches(0.9), Inches(1.55), Inches(5.0), Inches(2.2), desc, size=14, color=TEXT_2, line_spacing=1.6)
        if tags:
            tag_row(s, tags, Inches(0.9), Inches(3.9), fill=PAPER_3, text_color=TEXT_2)
        if style == "phone":
            phone_frame(s, shot, Inches(8.1), Inches(0.7), Inches(3.4), Inches(6.3))
        else:
            browser_frame(s, shot, Inches(6.2), Inches(0.85), Inches(6.3), Inches(6.0))
        page_no(s, nn())
        return s

    screen_slide(
        "03 · 사용자 화면 — 쇼츠", "세로로 넘겨보는 쇼츠 피드",
        "짧은 영상을 세로 스냅으로 빠르게 넘기며 봅니다. "
        "좋아요·싫어요, 댓글, 공유가 화면 안에서 바로 이루어지고 비회원도 로그인 없이 열람할 수 있습니다.",
        "front-feed-mobile.png", style="phone",
        tags=["세로 스냅", "좋아요·댓글", "비회원 열람 가능"],
    )

    screen_slide(
        "03 · 사용자 화면 — 커뮤니티", "영상을 이야기로 잇는 커뮤니티",
        "올린 영상을 커뮤니티 글로 공유해 같이 보고 이야기할 수 있습니다. "
        "글마다 일련번호가 붙어 상세 페이지에서 확인할 수 있고, 댓글과 대댓글로 대화가 이어집니다.",
        "front-community.png",
        tags=["게시글 공유", "댓글·대댓글", "일련번호"],
    )

    screen_slide(
        "03 · 사용자 화면 — 검색·프로필", "통합 검색과 프로필",
        "쇼츠·롱폼·커뮤니티·유저 네 영역을 한 번에 검색합니다. "
        "프로필에서는 올린 영상, 팔로워·팔로잉, 재생목록을 탭으로 나눠 볼 수 있습니다.",
        "front-search.png",
        tags=["통합 검색", "팔로우", "재생목록"],
    )

    screen_slide(
        "03 · 사용자 화면 — 실시간", "실시간 메시지와 알림",
        "1:1 메시지는 WebSocket으로 실시간 송수신됩니다. "
        "알림은 SSE로 즉시 도착하며, 읽음 처리와 전체 삭제도 확인 절차를 거쳐 안전하게 이루어집니다.",
        "front-messages.png",
        tags=["WebSocket", "SSE 알림", "실시간"],
    )

    # ---------------------------------------------------------- 10. AI 챗봇
    section_slide(prs, 4, "AI CHATBOT", "대화를 나누는\nAI 챗봇", "세 가지 모델 티어로 나눠 구성했습니다.", nn())

    s = new_slide(prs, PAPER)
    kicker(s, "04 · AI 챗봇", color=BRAND_2)
    text(s, Inches(0.9), Inches(0.78), Inches(5.3), Inches(0.65), "3가지 모델, 저장되는 대화", size=24, color=TEXT, bold=True)
    text(s, Inches(0.9), Inches(1.55), Inches(5.0), Inches(1.7),
         "누구나 쓸 수 있는 무료 모델부터, 로그인한 회원을 위한 대화 요약·저장 모델까지 세 단계로 나눴습니다.\n\n"
         "이미지·PDF·문서 파일을 첨부해 질문할 수 있고, 답변은 굵게·목록 등 마크다운으로 보기 좋게 표시됩니다.",
         size=14, color=TEXT_2, line_spacing=1.6)

    tiers = [
        ("Locals", "무료 · 비회원 가능", BRAND),
        ("Vide", "회원 전용 · 대화 요약", BRAND_2),
        ("Shape", "회원 전용 · 대화 기억", BLUE),
    ]
    ty = Inches(3.55)
    for name, desc, color in tiers:
        rect(s, Inches(0.9), ty, Inches(5.0), Inches(0.62), fill=PAPER_2, radius=0.2)
        oval(s, Inches(1.05), ty + Inches(0.16), Inches(0.3), Inches(0.3), color)
        text(s, Inches(1.55), ty, Inches(1.3), Inches(0.62), name, size=13.5, color=TEXT, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        text(s, Inches(3.0), ty, Inches(2.8), Inches(0.62), desc, size=11.5, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
        ty += Inches(0.75)

    browser_frame(s, "front-chatbot.png", Inches(6.2), Inches(0.85), Inches(6.3), Inches(6.0))
    page_no(s, nn())

    # ---------------------------------------------------------- 11~12. 관리자 콘솔
    section_slide(prs, 5, "ADMIN CONSOLE", "운영까지 갖춘\n관리자 콘솔", "신고 처리부터 계정 정지까지, 별도 앱으로 만들었습니다.", nn())

    s = new_slide(prs, PAPER)
    kicker(s, "05 · 관리자 콘솔", color=AMBER_INK)
    text(s, Inches(0.9), Inches(0.78), Inches(5.3), Inches(0.65), "운영 대시보드", size=24, color=TEXT, bold=True)
    text(s, Inches(0.9), Inches(1.55), Inches(5.0), Inches(2.6),
         "미처리 신고, 미답변 문의, 정지 계정 수를 한눈에 보여줍니다. "
         "\"처리해야 할 일이 남아 있는지\"가 운영자에게 가장 먼저 필요한 정보이기 때문입니다.\n\n"
         "사용자 웹앱과는 세션 쿠키 이름부터 다른 별도 애플리케이션으로 만들어, "
         "같은 브라우저에서 두 화면을 동시에 열어 두고 확인할 수 있습니다.",
         size=13.5, color=TEXT_2, line_spacing=1.55)
    tag_row(s, ["별도 세션", "실시간 지표"], Inches(0.9), Inches(6.05), fill=RGBColor(0xFD, 0xF4, 0xE7), text_color=AMBER_INK)
    browser_frame(s, "console-dashboard.png", Inches(6.2), Inches(0.85), Inches(6.3), Inches(6.0))
    page_no(s, nn())

    s = new_slide(prs, PAPER)
    kicker(s, "05 · 관리자 콘솔", color=AMBER_INK)
    text(s, Inches(0.9), Inches(0.78), Inches(11), Inches(0.65), "신고 처리부터 문의 답변까지", size=24, color=TEXT, bold=True)

    admin_shots = [
        ("console-reports.png", "신고 관리", "상태별 조회, 조치함/반려 처리"),
        ("console-users.png", "유저 관리", "계정 검색, 정지·해제"),
        ("console-content.png", "콘텐츠 관리", "쇼츠·롱폼·커뮤니티 삭제"),
    ]
    cw = Inches(3.85)
    cx = Inches(0.9)
    for shot, title, desc in admin_shots:
        browser_frame(s, shot, cx, Inches(1.65), cw - Inches(0.15), Inches(3.5))
        text(s, cx, Inches(5.35), cw - Inches(0.15), Inches(0.4), title, size=14.5, color=TEXT, bold=True)
        text(s, cx, Inches(5.78), cw - Inches(0.15), Inches(0.7), desc, size=11.5, color=MUTED, line_spacing=1.4)
        cx += cw
    page_no(s, nn())

    # ---------------------------------------------------------- 13. 기술 스택
    section_slide(prs, 6, "TECH & SCALE", "무엇으로,\n얼마나 만들었나", None, nn())

    s = new_slide(prs, PAPER)
    kicker(s, "06 · 기술 스택")
    text(s, Inches(0.9), Inches(0.85), Inches(11), Inches(0.7), "사용한 기술", size=26, color=TEXT, bold=True)

    stack_groups = [
        ("프론트엔드", ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "TanStack Query"], BRAND),
        ("백엔드", ["Node.js", "Express", "PostgreSQL", "WebSocket", "SSE"], TEAL),
        ("AI", ["LangChain", "LangGraph", "Google Gemini", "Groq"], BRAND_2),
        ("배포·운영", ["Cloudflare Workers", "Oracle Cloud", "GitHub Actions"], AMBER_INK),
    ]
    y = Inches(1.85)
    for label, tags, color in stack_groups:
        text(s, Inches(0.9), y + Inches(0.03), Inches(2.0), Inches(0.5), label, size=14, color=TEXT, bold=True)
        tag_row(s, tags, Inches(2.9), y, fill=PAPER_2, text_color=TEXT_2, h=Inches(0.42), size=12)
        y += Inches(0.85)

    rich(
        s, Inches(0.9), Inches(5.75), Inches(11.5), Inches(0.9),
        [("왜 이렇게 골랐나  ", BRAND, True),
         ("모두가 아는 인기 기술을 그대로 쓰기보다, 이 규모(개인 프로젝트, 3개 앱)에 "
          "맞는 것을 택했습니다. 예를 들어 처음엔 설치가 필요 없는 SQLite 로 시작했고, "
          "실제 서버에 올리기로 하면서 백업과 이력 관리가 되는 PostgreSQL 로 옮겼습니다.", TEXT_2, False)],
        size=13.5, line_spacing=1.55,
    )
    page_no(s, nn())

    # ---------------------------------------------------------- 14. 규모
    s = new_slide(prs, INK)
    kicker(s, "06 · 프로젝트 규모", on_dark=True)
    text(s, Inches(0.9), Inches(0.85), Inches(11), Inches(0.7), "숫자로 보는 VidShare", size=26, color=WHITE, bold=True)

    big = [
        ("16,100+", "줄의 TypeScript"),
        ("82", "REST API 엔드포인트"),
        ("22", "데이터베이스 테이블"),
        ("33", "화면 (사용자 27 · 관리자 6)"),
        ("188", "자동화 테스트"),
        ("177", "커밋 (커밋마다 상세 기록)"),
    ]
    cols = 3
    gw, gh = Inches(3.75), Inches(2.05)
    gx0, gy0 = Inches(0.9), Inches(1.95)
    for i, (num, label) in enumerate(big):
        r, c = divmod(i, cols)
        x = gx0 + c * (gw + Inches(0.15))
        y = gy0 + r * (gh + Inches(0.2))
        rect(s, x, y, gw - Inches(0.15), gh - Inches(0.2), fill=INK_2, line=INK_LINE, line_w=0.75, radius=0.1)
        text(s, x + Inches(0.3), y + Inches(0.32), gw - Inches(0.6), Inches(0.75), num, size=32, color=WHITE, bold=True)
        text(s, x + Inches(0.3), y + Inches(1.15), gw - Inches(0.6), Inches(0.55), label, size=12.5, color=MUTED_ON_DARK, line_spacing=1.3)
    page_no(s, nn(), dark=True)

    # ---------------------------------------------------------- 14-1. 운영 준비
    s = new_slide(prs, PAPER)
    kicker(s, "06 · 운영 준비")
    text(s, Inches(0.9), Inches(0.85), Inches(11.5), Inches(0.7), "켜 두면 계속 돌아가는 서비스로", size=26, color=TEXT, bold=True)
    text(s, Inches(0.9), Inches(1.55), Inches(11.5), Inches(0.5),
         "내 PC 에서만 돌던 서버를, 꺼지지 않는 클라우드 서버와 매일 백업되는 데이터베이스 위로 옮길 준비를 마쳤습니다.",
         size=14, color=MUTED)

    flow = [
        ("화면", "Cloudflare", "사용자 사이트 · 관리자 콘솔\n전 세계 가까운 곳에서 응답", BRAND),
        ("서버 · 데이터", "Oracle Cloud", "API 서버 + PostgreSQL\n24시간 가동, 자동 HTTPS", TEAL),
        ("백업", "내 PC (D 드라이브)", "매일 새벽 데이터 사본을\n내려받아 보관 · 복원 확인", AMBER_INK),
    ]
    fw, fh, fy = Inches(3.55), Inches(2.25), Inches(2.45)
    fx = Inches(0.9)
    for i, (title, where, desc, color) in enumerate(flow):
        rect(s, fx, fy, fw, fh, fill=PAPER_2, line=LINE, line_w=1, radius=0.08)
        rect(s, fx, fy, fw, Inches(0.12), fill=color, radius=0)
        text(s, fx + Inches(0.28), fy + Inches(0.32), fw - Inches(0.5), Inches(0.45), title, size=17, color=TEXT, bold=True)
        text(s, fx + Inches(0.28), fy + Inches(0.78), fw - Inches(0.5), Inches(0.35), where, size=11.5, color=MUTED, bold=True)
        text(s, fx + Inches(0.28), fy + Inches(1.25), fw - Inches(0.5), Inches(0.9), desc, size=12.5, color=TEXT_2, line_spacing=1.5)
        if i < len(flow) - 1:
            conn = s.shapes.add_connector(
                MSO_CONNECTOR.STRAIGHT, fx + fw, fy + fh // 2, fx + fw + Inches(0.42), fy + fh // 2
            )
            conn.line.color.rgb = MUTED
            conn.line.width = Pt(1.5)
        fx += fw + Inches(0.42)

    checks = [
        ("180", "개의 자동 검사가 코드를 올릴 때마다 실행"),
        ("151", "건의 기존 데이터를 새 데이터베이스로 빠짐없이 이전"),
        ("1번", "명령으로 백업 → 업데이트 → 상태 확인까지"),
    ]
    cx = Inches(0.9)
    for num, label in checks:
        text(s, cx, Inches(5.0), Inches(0.9), Inches(0.6), num, size=24, color=BRAND, bold=True)
        text(s, cx + Inches(0.85), Inches(5.08), Inches(3.0), Inches(0.75), label, size=12, color=TEXT_2, line_spacing=1.35)
        cx += Inches(3.95)

    rich(
        s, Inches(0.9), Inches(6.05), Inches(11.5), Inches(0.6),
        [("남은 일  ", BRAND, True),
         ("클라우드 서버를 만들고 도메인을 연결하면, 링크 하나로 모든 기능이 동작하는 라이브 서비스가 됩니다.", TEXT_2, False)],
        size=13.5,
    )
    page_no(s, nn())

    # ---------------------------------------------------------- 15. 회고
    s = new_slide(prs, PAPER)
    kicker(s, "07 · 회고")
    text(s, Inches(0.9), Inches(0.85), Inches(11), Inches(0.7), "잘한 점 & 아쉬운 점", size=26, color=TEXT, bold=True)

    text(s, Inches(0.9), Inches(1.7), Inches(5.3), Inches(0.4), "잘한 결정", size=15, color=RGBColor(0x15, 0x80, 0x3D), bold=True)
    good = [
        "관리자 콘솔을 별도 앱으로 분리 — 권한 경계를 진지하게 설계하게 됨",
        "모든 통신을 한 파일(lib/api.ts)로 모아 — 저장 방식이 바뀌어도 고칠 곳이 한 곳",
        "한계를 문서에 그대로 적어 둠 — 모르는 것과 알고 미룬 것은 다르다",
    ]
    y = Inches(2.2)
    for g in good:
        oval(s, Inches(0.9), y + Inches(0.08), Inches(0.14), Inches(0.14), RGBColor(0x15, 0x80, 0x3D))
        text(s, Inches(1.2), y, Inches(4.9), Inches(0.8), g, size=12.5, color=TEXT_2, line_spacing=1.4)
        y += Inches(0.95)

    text(s, Inches(6.9), Inches(1.7), Inches(5.3), Inches(0.4), "아쉬운 점", size=15, color=RGBColor(0xB4, 0x23, 0x18), bold=True)
    bad = [
        "자동 검사를 늦게 깖 — 테스트를 170건 넘게 만들고도 한동안 손으로 실행",
        "일부 코드 파일이 비대해짐 — 초반에 나눴다면 지금 분할 비용이 없었을 것",
        "성능·접근성을 측정한 적이 없음 — 기능이 안정된 지금이 잴 시점",
    ]
    y = Inches(2.2)
    for b in bad:
        oval(s, Inches(6.9), y + Inches(0.08), Inches(0.14), Inches(0.14), RGBColor(0xB4, 0x23, 0x18))
        text(s, Inches(7.2), y, Inches(5.0), Inches(0.8), b, size=12.5, color=TEXT_2, line_spacing=1.4)
        y += Inches(0.95)
    page_no(s, nn())

    # ---------------------------------------------------------- 16. 다음 계획
    s = new_slide(prs, PAPER)
    kicker(s, "07 · 다음 계획")
    text(s, Inches(0.9), Inches(0.85), Inches(11), Inches(0.7), "앞으로의 방향", size=26, color=TEXT, bold=True)

    plans = [
        ("1", "라이브 서비스 공개", "클라우드 서버·도메인 연결 — 배포 준비는 끝남"),
        ("2", "보안 강화", "Rate limiting, 보안 헤더, 입력 검증 스키마"),
        ("3", "운영 감사 로그", "관리자가 무엇을 했는지 추적할 수 있게"),
        ("4", "접근성 · 성능", "기능이 안정된 지금, 기준선을 측정하고 개선"),
        ("5", "영상 저장소 분리", "업로드가 늘면 전용 저장소로 옮겨 서버 부담을 덜기"),
    ]
    y = Inches(1.85)
    for no, title, desc in plans:
        pill(s, no, Inches(0.9), y, Inches(0.5), Inches(0.5), BRAND, WHITE, size=14)
        text(s, Inches(1.65), y - Inches(0.02), Inches(3.1), Inches(0.55), title, size=15, color=TEXT, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        text(s, Inches(5.0), y, Inches(7.3), Inches(0.55), desc, size=13, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
        y += Inches(0.85)
    page_no(s, nn())

    # ---------------------------------------------------------- 17. 클로징
    s = new_slide(prs, INK)
    bg_glow(s)
    text(s, Inches(0.9), Inches(2.7), Inches(11.5), Inches(1.3), "감사합니다", size=42, color=WHITE, bold=True)
    text(s, Inches(0.9), Inches(3.85), Inches(10), Inches(0.6),
         "더 자세한 내용은 아래 소개 사이트와 문서에서 확인하실 수 있습니다.",
         size=15, color=MUTED_ON_DARK)

    links = [
        ("포트폴리오 소개 사이트", "portfolio/site/index.html"),
        ("사용자 사이트", "vidshare-front.limjinheng0120.workers.dev"),
        ("관리자 콘솔", "vidshare-console.limjinheng0120.workers.dev"),
    ]
    y = Inches(4.75)
    for label, url in links:
        text(s, Inches(0.9), y, Inches(3.2), Inches(0.4), label, size=13, color=BLUE, bold=True)
        text(s, Inches(4.2), y, Inches(8.0), Inches(0.4), url, size=13, color=MUTED_ON_DARK)
        y += Inches(0.5)
    page_no(s, nn(), dark=True)

    prs.save(OUT)
    print(f"생성: {OUT}  ({n}장)")


if __name__ == "__main__":
    build()
