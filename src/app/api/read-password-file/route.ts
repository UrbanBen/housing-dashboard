import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({
        success: false,
        error: 'File path is required'
      }, { status: 400 });
    }

    // Resolve path with home directory support
    let resolvedPath = filePath;
    if (filePath.startsWith('~/')) {
      resolvedPath = path.join(os.homedir(), filePath.slice(2));
    } else if (!path.isAbsolute(filePath)) {
      // If it's a relative path, resolve it relative to the user's home directory
      resolvedPath = path.resolve(os.homedir(), filePath);
    }

    // Security check - ensure the path is within reasonable bounds
    const normalizedPath = path.normalize(resolvedPath);
    if (normalizedPath.includes('..')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file path - path traversal not allowed'
      }, { status: 400 });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json({
        success: false,
        error: `File not found: ${normalizedPath}`
      }, { status: 404 });
    }

    // Check if it's actually a file
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
      return NextResponse.json({
        success: false,
        error: `Path is not a file: ${normalizedPath}`
      }, { status: 400 });
    }

    // Read the file
    const content = fs.readFileSync(normalizedPath, 'utf8');
    const lines = content.split('\n');

    // Look for the first variable ending in 'PASSWORD'
    let password = '';
    let foundVariable = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Look for lines that match the pattern VARIABLE_PASSWORD=value
      const match = trimmed.match(/^([A-Z_]*PASSWORD)\s*=\s*(.*)$/);
      if (match) {
        foundVariable = match[1];
        let value = match[2];

        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        password = value;
        break;
      }
    }

    if (!password) {
      return NextResponse.json({
        success: false,
        error: 'No variable ending in "PASSWORD" found in the file'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      password: password,
      variable: foundVariable,
      filePath: normalizedPath
    });

  } catch (error) {
    console.error('Error reading password file:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}