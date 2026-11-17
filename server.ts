import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse CLI arguments if present
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;

// In dev mode, port must be 3000 (avoiding 8080 used by nginx container proxy).
// In production, use process.env.PORT || 3000.
const isProd = process.env.NODE_ENV === 'production';
const PORT = cliPort || (isProd ? Number(process.env.PORT) || 3000 : 3000);

// Body parser with 25mb limit for photo uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Google GenAI on server
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API Endpoint: Image Understanding with Gemini (gemini-4-argon)
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg', mode = 'product_detection', customPrompt } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan dalam request.' });
    }

    // Extract raw base64 data or fetch from URL
    let cleanBase64 = image;
    let detectedMime = mimeType;

    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
      try {
        const fetchRes = await fetch(image);
        const arrayBuf = await fetchRes.arrayBuffer();
        cleanBase64 = Buffer.from(arrayBuf).toString('base64');
        detectedMime = fetchRes.headers.get('content-type') || mimeType;
      } catch (fetchErr) {
        console.warn('Failed to fetch image URL on server:', fetchErr);
      }
    } else if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      detectedMime = parts[0].replace('data:', '') || mimeType;
      cleanBase64 = parts[1];
    }

    const ai = getAiClient();

    let systemInstruction = `Anda adalah asisten AI kasir dan ahli manajemen inventori toko kelontong & warung di Indonesia (Warung Pintar Pro).
Analisis foto yang diberikan dengan teliti. Jawab dalam Bahasa Indonesia yang ramah, ringkas, dan praktis untuk pemilik warung.

Bila gambar adalah produk dagangan:
- Identifikasi nama produk & merek yang spesifik (misal: "Indomie Mi Goreng 85g", "Kopi Kapal Api Spesial Mix 24g", "Sabun Lifebuoy Total 10 110g", "Dji Sam Soe 12").
- Tentukan kategori produk yang paling pas dari daftar berikut: ['Sembako', 'Makanan', 'Minuman', 'Rokok', 'Elektronik', 'Kesehatan', 'ATK', 'Lainnya'].
- Berikan estimasi harga modal (harga kulakan grosir) dan estimasi harga jual eceran yang wajar di warung Indonesia (dalam Rupiah).
- Tentukan apakah produk ini cocok dijual secara keteng/eceran (misal: rokok, sachet kopi, obat tablet).
- Berikan tips penyimpanan atau catatan kadaluarsa jika tertera pada kemasan.

Bila gambar adalah struk belanja/nota supplier:
- Rinci daftar barang yang dibeli beserta kuantitas dan harga belinya.
- Hitung total belanja nota dan rekomendasi pencatatan stok.

Bila gambar adalah rak atau kumpulan barang warung:
- Rinci barang-barang yang terdeteksi dan beri saran tata letak untuk meningkatkan penjualan.

PENTING: Di akhir respon, selalu sertakan blok JSON terstruktur di antara tag \`\`\`json dan \`\`\` dengan format persis seperti ini untuk integrasi otomatis ke sistem stok toko:
{
  "productName": "Nama Lengkap Produk",
  "category": "Kategori",
  "estimatedCostPrice": 15000,
  "estimatedSellingPrice": 18000,
  "isKeteng": false,
  "ketengPrice": 0,
  "pcsPerPack": 1,
  "description": "Deskripsi singkat produk dan tips penjualan",
  "detectedItems": [
    { "name": "Item 1", "qty": 1, "estPrice": 5000 }
  ]
}`;

    let promptText = customPrompt || 'Analisis gambar produk warung ini secara detail. Identifikasi nama produk, kategori, estimasi harga modal dan harga jual yang sesuai untuk warung kelontong Indonesia.';

    if (mode === 'receipt_scan') {
      promptText = customPrompt || 'Analisis foto nota/struk belanja supplier ini. Baca semua item barang, jumlah unit, harga satuan, dan total bayar faktur. Ekstrak data untuk pembukuan stok.';
    } else if (mode === 'shelf_audit') {
      promptText = customPrompt || 'Analisis foto rak/etalase warung ini. Identifikasi produk yang tersedia, produk yang stoknya menipis atau kosong, dan berikan saran penataan (merchandising) barang.';
    }

    const imagePart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    let response;
    let modelUsed = 'gemini-3.8-flash';

    try {
      // Primary model: gemini-3.8-flash (optimal for multimodal vision, fast, and available on Free Tier)
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [imagePart, { text: promptText }],
        },
        config: {
          systemInstruction,
        },
      });
    } catch (primaryErr: any) {
      // Secondary fallback model: gemini-3.1-flash-lite
      modelUsed = 'gemini-3.1-flash-lite';
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: {
            parts: [imagePart, { text: promptText }],
          },
          config: {
            systemInstruction,
          },
        });
      } catch (fallbackErr: any) {
        throw new Error(fallbackErr?.message || primaryErr?.message || 'Gagal menganalisis gambar dengan AI');
      }
    }

    const responseText = response.text || 'Tidak ada teks yang dihasilkan.';

    // Try to extract structured JSON from responseText
    let structuredData: any = null;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        structuredData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('Could not parse extracted JSON block:', e);
      }
    }

    res.json({
      success: true,
      modelUsed,
      text: responseText,
      structuredData,
    });
  } catch (err: any) {
    console.error('Gemini image analysis error:', err);
    res.status(500).json({
      error: err?.message || 'Terjadi kesalahan saat menganalisis gambar dengan Gemini.',
    });
  }
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
