# 업로드 파일

사용자가 올린 영상·썸네일이 여기 저장됩니다. 파일명은 UUID + 확장자입니다.

| 항목 | 값 |
|------|-----|
| URL | `GET /uploads/<uuid>.<ext>` |
| 업로드 | `POST /api/uploads?kind=image\|video` (로그인 필요, `file` 필드) |
| 이미지 | jpg / png / webp / gif, 최대 8MB |
| 영상 | mp4 / webm / mov, 최대 100MB |

경로를 바꾸려면 `BackendServer/.env` 의 `UPLOADS_PATH` 를 씁니다. 비우면 이 폴더입니다.

이 폴더의 실제 미디어 파일은 Git에 올리지 않습니다.
