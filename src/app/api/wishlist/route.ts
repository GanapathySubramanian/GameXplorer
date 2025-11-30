import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch all wishlist items for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: "desc" },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("Error fetching wishlist items:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add a game to wishlist
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { gameId, gameData, status } = await req.json()

    if (!gameId || !gameData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if already exists
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId: Number(gameId),
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Game already in wishlist" }, { status: 409 })
    }

    const item = await prisma.wishlistItem.create({
      data: {
        userId: session.user.id,
        gameId: Number(gameId),
        gameData: gameData,
        status: status || "wishlist",
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Error adding to wishlist:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update wishlist item status
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { gameId, status } = await req.json()

    if (!gameId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const item = await prisma.wishlistItem.update({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId: Number(gameId),
        },
      },
      data: { status },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error("Error updating wishlist item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove a game from wishlist
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

    await prisma.wishlistItem.delete({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId: Number(gameId),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing from wishlist:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
