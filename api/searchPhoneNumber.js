import fetch from 'node-fetch';

const MONDAY_API_URL = 'https://api.monday.com/v2';
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;

const BOARD_IDS = [1645436514, 2177969450, 1645017543];

export default async function handler(req, res) {
  const rawPhone = req.query.phone;
  if (!rawPhone) return res.status(400).json({ error: 'Missing phone query param' });

  const phoneToSearch = rawPhone.replace(/\D/g, ''); // Cleaned number like 37061234567

  const headers = {
    'Content-Type': 'application/json',
    Authorization: MONDAY_API_TOKEN
  };

  const matches = [];

  for (const boardId of BOARD_IDS) {
    const itemsRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          query {
            boards(ids: ${boardId}) {
              name
              items {
                id
                name
                column_values {
                  id
                  title
                  text
                }
              }
            }
          }
        `
      })
    });

    const data = await itemsRes.json();
    const board = data?.data?.boards?.[0];
    if (!board) continue;

    for (const item of board.items) {
      for (const column of item.column_values) {
        const cleaned = column.text?.replace(/\D/g, '');
        if (cleaned && cleaned.includes(phoneToSearch)) {
          matches.push({
            board: board.name,
            boardId,
            item: item.name,
            itemId: item.id,
            column: column.title,
            value: column.text
          });
        }
      }
    }
  }

  res.status(200).json({ found: matches.length, matches });
}
