import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanImage } from "@/lib/ai/gemini";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image");
  const mode = form.get("mode");
  if (!(file instanceof File) || (mode !== "fridge" && mode !== "receipt")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await scanImage(mode, base64, file.type || "image/jpeg");
    return NextResponse.json(result);
  } catch (e) {
    console.error("Scan failed:", e);
    return NextResponse.json(
      { error: "Couldn't read that image. Try a clearer photo." },
      { status: 502 }
    );
  }
}
