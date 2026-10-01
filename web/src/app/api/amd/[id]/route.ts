import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";

/** GET a single saved AmdScreening -- the /amd/[id] equivalent of
 * /api/glaucoma/[id]. Same ownership policy: not found AND not-yours both
 * 404, so a guessed id can't be used to confirm whether it belongs to
 * someone else. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screening = await prisma.amdScreening.findUnique({ where: { id } });
  if (!screening || screening.userId !== user.id) {
    return NextResponse.json({ error: "Không tìm thấy kết quả." }, { status: 404 });
  }

  return NextResponse.json({
    id: screening.id,
    cloudUrl: screening.cloudUrl,
    createdAt: screening.createdAt,
    label: screening.label,
    probAmd: screening.probAmd,
    modelVersion: screening.modelVersion,
    isExperimental: true,
  });
}
