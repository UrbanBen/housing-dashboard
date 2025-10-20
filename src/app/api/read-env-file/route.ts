import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Resolve the file path, handling ~ for home directory
    let resolvedPath = filePath;
    if (filePath.startsWith('~/')) {
      resolvedPath = path.join(os.homedir(), filePath.slice(2));
    } else if (filePath.startsWith('./')) {
      resolvedPath = path.resolve(process.cwd(), filePath);
    } else if (filePath.startsWith('../')) {
      resolvedPath = path.resolve(process.cwd(), filePath);
    } else if (!path.isAbsolute(filePath)) {
      resolvedPath = path.resolve(process.cwd(), filePath);
    }

    // Security check: ensure the file is a .env file (various patterns)
    const fileName = path.basename(resolvedPath);
    const isEnvFile =
      // Standard .env files
      fileName === '.env' ||
      fileName.startsWith('.env.') ||
      fileName.startsWith('.env-') ||
      fileName.endsWith('.env') ||
      // Environment variations
      fileName.includes('env.') ||
      fileName.includes('environment') ||
      fileName.includes('.env') ||
      // Common patterns
      /\.(env|dotenv)(\.|$)/i.test(fileName) ||
      // Allow any file containing 'env' for flexibility
      /env/i.test(fileName);

    if (!isEnvFile) {
      return NextResponse.json({
        error: `Only .env files are allowed. File provided: ${fileName}`,
        suggestion: 'Please provide a file with .env extension or containing "env" in the name'
      }, { status: 400 });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({
        error: `File not found: ${resolvedPath}`,
        suggestion: 'Check if the path is correct and the file exists. Hidden files like .env should be accessible with this API.'
      }, { status: 404 });
    }

    // Check if it's actually a file (not a directory)
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Path is not a file' }, { status: 400 });
    }

    // Read the file content
    const content = fs.readFileSync(resolvedPath, 'utf8');

    return NextResponse.json({
      content,
      filePath: resolvedPath,
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    });

  } catch (error) {
    console.error('Error reading .env file:', error);

    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        return NextResponse.json({
          error: 'File not found',
          details: error.message
        }, { status: 404 });
      } else if (error.message.includes('EACCES')) {
        return NextResponse.json({
          error: 'Permission denied',
          details: 'Check file permissions for the .env file'
        }, { status: 403 });
      }
    }

    return NextResponse.json({
      error: 'Failed to read file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}