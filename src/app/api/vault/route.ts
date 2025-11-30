import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch all vault items for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const items = await prisma.vaultItem.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: "desc" },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("Error fetching vault items:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add a game to vault
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { gameId, gameData } = await req.json()

    if (!gameId || !gameData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if already exists
    const existing = await prisma.vaultItem.findUnique({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId: Number(gameId),
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Game already in vault" }, { status: 409 })
    }

    const item = await prisma.vaultItem.create({
      data: {
        userId: session.user.id,
        gameId: Number(gameId),
        gameData: gameData,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Error adding to vault:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove a game from vault
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const gameId = searchParams.get("gameId")

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 })
    }

    await prisma.vaultItem.delete({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId: Number(gameId),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing from vault:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
