import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// GET /api/content/fitness-story - Get the fitness story content from markdown
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "content", "fitness-story.md");
    const fileContent = await fs.readFile(filePath, "utf-8");

    // Parse markdown content
    const lines = fileContent.split("\n");
    let title = "Why I Built This";
    const paragraphs: string[] = [];
    let authorName = "Pete";
    let authorTitle = "Creator of Iron Quest";
    let authorInitials = "PM";

    let inParagraph = false;
    let currentParagraph = "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract title from # heading
      if (trimmed.startsWith("# ")) {
        title = trimmed.substring(2);
        continue;
      }

      // Skip --- divider
      if (trimmed === "---") {
        if (currentParagraph) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = "";
        }
        continue;
      }

      // Extract author metadata
      if (trimmed.startsWith("**Author:**")) {
        authorName = trimmed.replace("**Author:**", "").trim();
        continue;
      }
      if (trimmed.startsWith("**Title:**")) {
        authorTitle = trimmed.replace("**Title:**", "").trim();
        continue;
      }
      if (trimmed.startsWith("**Initials:**")) {
        authorInitials = trimmed.replace("**Initials:**", "").trim();
        continue;
      }

      // Collect paragraph text
      if (trimmed) {
        if (currentParagraph) {
          currentParagraph += " " + trimmed;
        } else {
          currentParagraph = trimmed;
        }
        inParagraph = true;
      } else if (inParagraph && currentParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
        inParagraph = false;
      }
    }

    // Add any remaining paragraph
    if (currentParagraph) {
      paragraphs.push(currentParagraph.trim());
    }

    return NextResponse.json({
      content: {
        title,
        paragraphs,
        authorName,
        authorTitle,
        authorInitials,
      },
    });
  } catch (error) {
    console.error("Error reading fitness story:", error);
    // Return fallback content
    return NextResponse.json({
      content: {
        title: "Why I Built This",
        paragraphs: [
          "I've been lifting for years, but I kept falling off the wagon. Every fitness app felt like a chore—just another place to log data that nobody cared about.",
          "Then I realized: I never quit playing video games. The XP, the levels, the achievements—they kept me coming back. What if the gym felt the same way?",
          "Iron Quest is the app I wished existed. Every PR feels like defeating a boss. Every workout streak is a combo multiplier. The gym isn't a chore anymore. It's the best game I've ever played.",
        ],
        authorName: "Pete",
        authorTitle: "Creator of Iron Quest",
        authorInitials: "PM",
      },
    });
  }
}
