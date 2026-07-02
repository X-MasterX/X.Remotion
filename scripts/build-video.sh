#!/bin/bash
set -e

# Chạy script tạo TTS và phân đoạn dữ liệu
bun run scripts/pre-render-tts.ts

# Xóa inputs.txt cũ nếu có
rm -f public/inputs.txt

# Render từng chunk, giới hạn 2 chunk tại một thời điểm
# Bằng cách sử dụng xargs hoặc một vòng lặp kiểm soát concurrency.
# Ở đây ta chạy từng chunk hoặc chay // 2 jobs
chunks_count=$(ls public/chunk_*.json | wc -l)
echo "Sẽ render $chunks_count chunks..."

# Loop để tạo jobs chạy song song với giới hạn concurrency
pids=()
max_jobs=2
current_jobs=0

rm -f public/inputs.txt
for chunk_file in $(ls public/chunk_*.json | sort -V); do
  # Lấy tên file không có đuôi
  chunk_name=$(basename "$chunk_file" .json)
  output_file="public/${chunk_name}.mp4"

  echo "Đang render $chunk_file thành $output_file..."

  node_modules/.bin/remotion render src/Root.tsx MyComposition "$output_file" --props="$chunk_file" --concurrency=2 --crf=22 &
  pids+=($!)

  # Thêm vào file danh sách inputs cho ffmpeg
  echo "file '${chunk_name}.mp4'" >> public/inputs.txt

  current_jobs=$((current_jobs+1))
  if [ $current_jobs -ge $max_jobs ]; then
    # Đợi tất cả các tiến trình con hiện tại hoàn thành trước khi chuyển sang batch mới
    for pid in "${pids[@]}"; do
      wait $pid
    done
    pids=()
    current_jobs=0
  fi
done

# Đợi những job còn lại trong batch cuối cùng
for pid in "${pids[@]}"; do
  wait $pid
done

echo "Tất cả các chunks đã được render xong. Đang tiến hành hợp nhất bằng ffmpeg..."

# Sử dụng đường dẫn tương đối trong thư mục public khi dùng ffmpeg
cd public
ffmpeg -y -f concat -safe 0 -i inputs.txt -c copy output.mp4
cd ..

echo "Video hoàn chỉnh đã được tạo tại public/output.mp4"
