import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'fs';

interface RequestBody {
  lgaName: string;
  host: string;
  port: number;
  database: string;
  user: string;
  passwordPath: string;
  schema: string;
  table: string;
  lgaColumn: string;
}

export async function POST(request: NextRequest) {
  let client: Client | null = null;

  try {
    const body: RequestBody = await request.json();
    const { lgaName, host, port, database, user, passwordPath, schema, table, lgaColumn } = body;

    // Read password from file
    let password: string;
    try {
      const envContent = fs.readFileSync(passwordPath, 'utf8');
      const passwordMatch = envContent.match(/(?:POSTGRES_PASSWORD|DB_PASSWORD|PASSWORD)=(.+)/);
      if (!passwordMatch) {
        throw new Error('Password not found in file');
      }
      password = passwordMatch[1].trim();
    } catch (error) {
      console.error('Error reading password file:', error);
      return NextResponse.json(
        { error: 'Failed to read database password' },
        { status: 500 }
      );
    }

    // Connect to database
    client = new Client({
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Query for dwelling type data with aggregation to handle potential duplicates
    const query = `
      SELECT
        dwtd_dwelling_type as dwelling_type,
        SUM(value) as value
      FROM ${schema}.${table}
      WHERE ${lgaColumn} = $1
      GROUP BY dwtd_dwelling_type
      ORDER BY dwtd_dwelling_type
    `;

    const result = await client.query(query, [lgaName]);

    await client.end();
    client = null;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this LGA' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching dwelling type data:', error);

    if (client) {
      try {
        await client.end();
      } catch (endError) {
        console.error('Error closing client:', endError);
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch dwelling type data',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
