import { redirect } from "next/navigation";
import { uploadHref } from "@/lib/upload-tabs";

/** 예전 주소. 롱폼 등록은 /upload 의 "롱폼 업로드" 탭으로 합쳐졌다. */
export default function LongformWritePage() {
  redirect(uploadHref("longform"));
}
