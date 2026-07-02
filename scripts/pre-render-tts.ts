import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import mp3Duration from 'mp3-duration';

// Load lesson data
const lessonPath = path.resolve('./data/lesson.json');
const lessonData = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));

const publicDir = path.resolve('./public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Lựa chọn giọng tiếng Việt của Edge TTS
const tts = new EdgeTTS({
  voice: 'vi-VN-NamMinhNeural', // Jules đẹp trai thì chọn giọng Nam Minh nhé!
});

async function generateTTS() {
  console.log('Bắt đầu sinh âm thanh TTS cho các scene...');

  const updatedScenes = [];

  for (let i = 0; i < lessonData.scenes.length; i++) {
    const scene = lessonData.scenes[i];
    const outputPath = path.join(publicDir, `${scene.id}.mp3`);

    console.log(`Đang xử lý scene ${scene.id}: "${scene.text}"`);

    // Gọi API TTS
    await tts.ttsPromise(scene.text, outputPath);

    // Đo đạc độ dài thực tế của audio
    const durationInSeconds = await mp3Duration(outputPath);

    // Lưu thông tin vào file JSON, thêm 0.5 giây padding cho tự nhiên
    scene.durationInSeconds = durationInSeconds + 0.5;
    scene.audioUrl = `/${scene.id}.mp3`; // Static file từ public/

    updatedScenes.push(scene);
    console.log(`✓ Đã lưu ${outputPath} (Thời lượng: ${scene.durationInSeconds.toFixed(2)}s)`);
  }

  // Ghi đè lại data json
  lessonData.scenes = updatedScenes;
  fs.writeFileSync(lessonPath, JSON.stringify(lessonData, null, 2));

  console.log('Sinh âm thanh hoàn tất!');

  // Bẻ nhỏ dữ liệu thành các chunk
  const chunks = [];
  let currentChunk = [];
  let currentDuration = 0;

  for (const scene of updatedScenes) {
    currentChunk.push(scene);
    currentDuration += scene.durationInSeconds;

    // Khoảng 40s cho mỗi chunk
    if (currentDuration >= 40) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentDuration = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // Xóa các file chunk.json cũ
  const files = fs.readdirSync(publicDir);
  for (const file of files) {
    if (file.startsWith('chunk_') && file.endsWith('.json')) {
      fs.unlinkSync(path.join(publicDir, file));
    }
  }

  const chunkFiles = [];
  chunks.forEach((chunk, index) => {
    const chunkFile = path.join(publicDir, `chunk_${index + 1}.json`);
    const chunkData = {
      lessonTitle: lessonData.lessonTitle,
      scenes: chunk,
    };
    fs.writeFileSync(chunkFile, JSON.stringify(chunkData, null, 2));
    chunkFiles.push(`public/chunk_${index + 1}.json`);
    console.log(`✓ Đã lưu chunk ${index + 1} (${chunk.length} scenes) vào ${chunkFile}`);
  });

  fs.writeFileSync(path.join(publicDir, 'chunks_list.json'), JSON.stringify(chunkFiles, null, 2));
  console.log('Phân đoạn dữ liệu hoàn tất! Sẵn sàng render.');
}

generateTTS().catch(console.error);
