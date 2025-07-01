import fetch from 'node-fetch';

const MONDAY_API_URL = 'https://api.monday.com/v2';
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const BOARD_IDS = [1645436514, 2177969450, 1645017543];

export default async function handler(req, res) {
  const rawPhone = req.query.phone;
  if (!rawPhone) {
    console.log('❌ No phone query param provided.');
    return res.status(400).json({ error: 'Missing phone query param' });
  }

  const phoneToSearch = rawPhone.replace(/\D/g, '');
  console.log('🔍 Searching for phone number (normalized):', phoneToSearch);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: MONDAY_API_TOKEN
  };

  const matches = [];

  for (const boardId of BOARD_IDS) {
    console.log('\n📋 Fetching board:', boardId);

    const query = `
      query {
        boards(ids: ${boardId}) {
          name
          items {
            id
            name
            column_values {
              id
              title
              type
              text
              ... on PhoneValue {
                phone
              }
              ... on MirrorValue {
                display_value
              }
            }
          }
        }
      }
    `;

    console.log('📤 Sending GraphQL request...');
    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });

    let json;
    try {
      json = await response.json();
      console.log('✅ Response received');
    } catch (err) {
      console.error('❌ Failed to parse JSON response:', err);
      continue;
    }

    if (json.errors) {
      console.error('❌ GraphQL errors for board', boardId, ':', JSON.stringify(json.errors, null, 2));
      continue;
    }

    const board = json?.data?.boards?.[0];
    if (!board) {
      console.warn('⚠️ Board not found or empty:', boardId);
      continue;
    }

    console.log(`📘 Board name: ${board.name}`);
    console.log(`📦 Total items: ${board.items.length}`);

    for (const item of board.items) {
      console.log(`🧾 Item: ${item.name} (ID: ${item.id})`);

      for (const column of item.column_values) {
        const { id, title, type } = column;
        let value = column.text || '';

        if (type === 'mirror') {
          value = column.display_value || '';
        }

        if (type === 'phone') {
          value = column.phone || '';
        }

        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.includes(phoneToSearch);

        console.log(`🔍 Checking column "${title}" [${type}]:`, value, '| Cleaned:', cleaned, '| Match:', match);

        if (match) {
          console.log('✅ MATCH FOUND!');
          matches.push({
            board: board.name,
            boardId,
            item: item.name,
            itemId: item.id,
            column: title,
            value: value
          });
        }
      }
    }
  }

  console.log(`\n✅ Search complete. Total matches: ${matches.length}`);
  return res.status(200).json({ found: matches.length, matches });
}
