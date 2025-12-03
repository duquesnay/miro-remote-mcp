#!/usr/bin/env node
/**
 * Test script to explore layer/z-order information in Miro REST API v2
 *
 * This script creates multiple overlapping items and examines:
 * 1. What order items are returned by the API
 * 2. Whether any z-index/layer fields exist in responses
 * 3. How creation order affects item retrieval order
 */
import dotenv from 'dotenv';
import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';

dotenv.config();

async function testLayerAPI() {
  console.log('=== Miro Layer/Z-Order API Investigation ===\n');

  // Initialize OAuth manager
  const oauth = new OAuth2Manager(
    process.env.MIRO_CLIENT_ID!,
    process.env.MIRO_CLIENT_SECRET!,
    process.env.MIRO_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
  );

  // Set tokens from environment
  if (process.env.MIRO_ACCESS_TOKEN && process.env.MIRO_REFRESH_TOKEN) {
    await oauth.setTokens(
      process.env.MIRO_ACCESS_TOKEN,
      process.env.MIRO_REFRESH_TOKEN
    );
    console.log('✓ Tokens loaded from environment\n');
  } else {
    console.error('✗ Missing tokens in environment variables');
    process.exit(1);
  }

  const miroClient = new MiroClient(oauth);

  // Create a test board
  console.log('Step 1: Creating test board...');
  const testBoard = await miroClient.createBoard(
    'Layer Investigation - ' + new Date().toISOString(),
    'Testing z-order/layer information in REST API v2'
  );
  console.log(`✓ Created board: ${testBoard.name}`);
  console.log(`  Board ID: ${testBoard.id}`);
  console.log(`  View link: ${testBoard.viewLink}\n`);

  // Create multiple overlapping items in a specific order
  console.log('Step 2: Creating overlapping items (same position)...');
  const creationOrder: Array<{ order: number; id: string; type: string; color: string }> = [];

  // Item 1: Yellow sticky note (bottom layer - created first)
  const item1 = await miroClient.createStickyNote(
    testBoard.id,
    '<p>Item 1 - Created FIRST (should be bottom)</p>',
    { x: 0, y: 0, color: 'yellow' }
  );
  creationOrder.push({ order: 1, id: item1.id, type: 'sticky_note', color: 'yellow' });
  console.log(`  1. Created sticky note (yellow): ${item1.id}`);
  await sleep(500); // Small delay to ensure different timestamps

  // Item 2: Blue shape
  const item2 = await miroClient.createShape(
    testBoard.id,
    '<p>Item 2 - Created SECOND</p>',
    'rectangle',
    { x: 0, y: 0, fillColor: 'blue', width: 250, height: 150 }
  );
  creationOrder.push({ order: 2, id: item2.id, type: 'shape', color: 'blue' });
  console.log(`  2. Created shape (blue): ${item2.id}`);
  await sleep(500);

  // Item 3: Pink sticky note (top layer - created last)
  const item3 = await miroClient.createStickyNote(
    testBoard.id,
    '<p>Item 3 - Created LAST (should be top)</p>',
    { x: 0, y: 0, color: 'pink' }
  );
  creationOrder.push({ order: 3, id: item3.id, type: 'sticky_note', color: 'pink' });
  console.log(`  3. Created sticky note (pink): ${item3.id}\n`);
  await sleep(500);

  // List all items and examine the response
  console.log('Step 3: Retrieving items and analyzing response...');
  const items = await miroClient.listItems(testBoard.id);
  console.log(`✓ Retrieved ${items.length} items\n`);

  // Analyze the response order
  console.log('=== ANALYSIS ===\n');

  console.log('Creation order vs Retrieval order:');
  console.log('─────────────────────────────────────');
  items.forEach((item, index) => {
    const createdItem = creationOrder.find(c => c.id === item.id);
    console.log(`Position ${index + 1} in API response:`);
    console.log(`  Item ID: ${item.id}`);
    console.log(`  Type: ${item.type}`);
    console.log(`  Created: ${createdItem?.order || 'unknown'} (${createdItem?.color})`);
    console.log(`  Created at: ${item.createdAt}`);
    console.log(`  Modified at: ${item.modifiedAt}`);
    console.log();
  });

  // Check for any z-index or layer-related fields
  console.log('Examining full item response for z-index/layer fields:');
  console.log('─────────────────────────────────────────────────────');
  const sampleItem = await miroClient.getItem(testBoard.id, item2.id);
  console.log('Sample item (full response):');
  console.log(JSON.stringify(sampleItem, null, 2));
  console.log();

  // Check all top-level keys
  console.log('Top-level keys in item response:');
  console.log(Object.keys(sampleItem).join(', '));
  console.log();

  // Look for any ordering-related fields
  const orderingFields = Object.keys(sampleItem).filter(key =>
    key.toLowerCase().includes('order') ||
    key.toLowerCase().includes('layer') ||
    key.toLowerCase().includes('index') ||
    key.toLowerCase().includes('stack') ||
    key.toLowerCase().includes('z')
  );

  if (orderingFields.length > 0) {
    console.log('⚠️  Found potential ordering fields:');
    orderingFields.forEach(field => {
      console.log(`  - ${field}: ${JSON.stringify((sampleItem as any)[field])}`);
    });
  } else {
    console.log('✗ No z-index, layer, order, or stack fields found in response');
  }
  console.log();

  // Test position.relativeTo field
  console.log('Testing position.relativeTo field:');
  console.log('──────────────────────────────────');
  items.forEach(item => {
    if (item.position) {
      console.log(`${item.type} (${item.id}):`);
      console.log(`  position.relativeTo: ${item.position.relativeTo || 'not present'}`);
      console.log(`  position.origin: ${item.position.origin || 'not present'}`);
    }
  });
  console.log();

  // Summary
  console.log('=== SUMMARY ===\n');
  console.log('Findings:');

  // Check if items are in creation order
  const isCreationOrder = items.every((item, index) => {
    const created = creationOrder.find(c => c.id === item.id);
    return created?.order === index + 1;
  });

  const isReverseCreationOrder = items.every((item, index) => {
    const created = creationOrder.find(c => c.id === item.id);
    return created?.order === items.length - index;
  });

  if (isCreationOrder) {
    console.log('✓ Items returned in CREATION ORDER (oldest first)');
  } else if (isReverseCreationOrder) {
    console.log('✓ Items returned in REVERSE CREATION ORDER (newest first)');
  } else {
    console.log('? Items returned in UNKNOWN ORDER (not matching creation sequence)');
  }

  console.log(`✗ No explicit z-index or layer field found in API response`);
  console.log(`ℹ  position.relativeTo field: ${items[0]?.position?.relativeTo || 'not present'}`);

  console.log('\n=== Investigation Complete ===');
  console.log(`View the test board to see actual layer order:`);
  console.log(testBoard.viewLink);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testLayerAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
