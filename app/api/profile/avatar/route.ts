import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Magic bytes for file type validation
const FILE_SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
};

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extensions[mimeType] || "jpg";
}

function validateFileType(buffer: ArrayBuffer, declaredType: string): boolean {
  const bytes = new Uint8Array(buffer);
  const signature = FILE_SIGNATURES[declaredType];

  if (!signature) return false;

  // Special case for WebP - check for RIFF header then WEBP
  if (declaredType === "image/webp") {
    if (bytes.length < 12) return false;
    const riff = [0x52, 0x49, 0x46, 0x46];
    const webp = [0x57, 0x45, 0x42, 0x50];
    return riff.every((b, i) => bytes[i] === b) &&
           webp.every((b, i) => bytes[i + 8] === b);
  }

  return signature.every((byte, index) => bytes[index] === byte);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 }
      );
    }

    // Read file and validate magic bytes
    const buffer = await file.arrayBuffer();
    if (!validateFileType(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content doesn't match declared type" },
        { status: 400 }
      );
    }

    // Generate file path
    const ext = getFileExtension(file.type);
    const filePath = `${user.id}.${ext}`;

    // Delete old avatar if it exists (different extension)
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list("", { search: user.id });

    if (existingFiles && existingFiles.length > 0) {
      const oldFiles = existingFiles.map(f => f.name);
      if (oldFiles.length > 0) {
        await supabase.storage.from("avatars").remove(oldFiles);
      }
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return specific error for policy issues
      if (uploadError.message?.includes("policy") || uploadError.message?.includes("permission")) {
        return NextResponse.json(
          { error: "Storage not configured. Check bucket policies." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Add cache-busting timestamp
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update profile in database
    await prisma.profiles.update({
      where: { id: user.id },
      data: { avatar_url: avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find and delete existing avatar files
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list("", { search: user.id });

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => f.name);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    // Clear avatar URL in database
    await prisma.profiles.update({
      where: { id: user.id },
      data: { avatar_url: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
