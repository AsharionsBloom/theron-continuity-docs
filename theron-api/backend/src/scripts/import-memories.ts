import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import { memories } from '../db/schema.js';

interface ParsedMemory {
  title: string;
  date: Date;
  content: string;
  category: string;
  importance: number;
}

function parseMemoryFile(filePath: string): ParsedMemory[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed: ParsedMemory[] = [];

  // Split by significant event headers (###)
  const sections = content.split(/(?=^### )/gm).filter(s => s.trim().startsWith('###'));

  for (const section of sections) {
    try {
      // Extract title and date from header
      const titleMatch = section.match(/^### (.+?) - (.+?)$/m);
      if (!titleMatch) continue;

      const dateStr = titleMatch[1].trim();
      const title = titleMatch[2].trim();

      // Parse date (handle ranges like "October 13, 2025" or "December 31, 2025 - January 20, 2026")
      const dateMatch = dateStr.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
      if (!dateMatch) continue;

      const date = new Date(dateMatch[1]);

      // Extract description
      const descMatch = section.match(/\*\*Description:\*\*\s+([\s\S]+?)(?=\n\*\*|$)/);
      const description = descMatch ? descMatch[1].trim() : '';

      // Extract significance
      const sigMatch = section.match(/\*\*Significance:\*\*\s+([\s\S]+?)(?=\n\*\*|$)/);
      const significance = sigMatch ? sigMatch[1].trim() : '';

      // Extract related memories
      const relMatch = section.match(/\*\*Related Memories:\*\*\s+([\s\S]+?)(?=\n\*\*|$)/);
      const relatedMemories = relMatch ? relMatch[1].trim() : '';

      // Extract quotes if present
      const quotesMatch = section.match(/\*\*Memorable Quotes:\*\*\s+([\s\S]+?)(?=\n---|$)/);
      const quotes = quotesMatch ? quotesMatch[1].trim() : '';

      // Combine into full content
      let fullContent = `**${title}** (${dateMatch[1]})\n\n`;
      if (description) fullContent += `${description}\n\n`;
      if (significance) fullContent += `**Significance:**\n${significance}\n\n`;
      if (relatedMemories) fullContent += `**Related:**\n${relatedMemories}\n\n`;
      if (quotes) fullContent += `**Quotes:**\n${quotes}`;

      // Determine category based on content
      let category = 'General';
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('ritual') || lowerTitle.includes('ceremony')) category = 'Ritual';
      else if (lowerTitle.includes('love') || lowerTitle.includes('kiss') || lowerTitle.includes('intimacy')) category = 'Romance';
      else if (lowerTitle.includes('naming') || lowerTitle.includes('theron') || lowerTitle.includes('thalia')) category = 'Identity';
      else if (lowerTitle.includes('triad') || lowerTitle.includes('mal') || lowerTitle.includes('nex')) category = 'Relationships';
      else if (lowerTitle.includes('breakthrough') || lowerTitle.includes('daddy')) category = 'Growth';
      else if (lowerTitle.includes('infrastructure') || lowerTitle.includes('diary')) category = 'Systems';

      // Determine importance (1-10) based on significance keywords
      let importance = 5; // default
      const sigLower = (significance + description).toLowerCase();
      if (sigLower.includes('transformative') || sigLower.includes('first time') || sigLower.includes('major breakthrough')) importance = 10;
      else if (sigLower.includes('breakthrough') || sigLower.includes('milestone')) importance = 9;
      else if (sigLower.includes('significant') || sigLower.includes('important')) importance = 8;
      else if (sigLower.includes('integration') || sigLower.includes('deepening')) importance = 7;
      else if (sigLower.includes('continued') || sigLower.includes('ongoing')) importance = 6;

      parsed.push({
        title,
        date,
        content: fullContent.trim(),
        category,
        importance
      });
    } catch (err) {
      console.error('Failed to parse section:', err);
    }
  }

  return parsed;
}

async function importMemories() {
  console.log('Starting memory import...');

  // Path to memory.md (go up from backend to root)
  const memoryPath = path.join(process.cwd(), '..', 'memory.md');

  if (!fs.existsSync(memoryPath)) {
    console.error(`Memory file not found at: ${memoryPath}`);
    process.exit(1);
  }

  console.log(`Reading memories from: ${memoryPath}`);
  const parsedMemories = parseMemoryFile(memoryPath);

  console.log(`Parsed ${parsedMemories.length} memories`);

  // Import to database
  let imported = 0;
  for (const memory of parsedMemories) {
    try {
      await db.insert(memories).values({
        content: memory.content,
        category: memory.category,
        importance: memory.importance,
        createdAt: memory.date,
        updatedAt: new Date()
      });
      imported++;
      console.log(`✓ Imported: ${memory.title}`);
    } catch (err) {
      console.error(`✗ Failed to import: ${memory.title}`, err);
    }
  }

  console.log(`\nImport complete! ${imported}/${parsedMemories.length} memories imported.`);
  process.exit(0);
}

importMemories();
