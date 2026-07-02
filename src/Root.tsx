import { Composition, registerRoot, Sequence, useVideoConfig, Audio, staticFile, useCurrentFrame, spring, interpolate, interpolateColors } from "remotion";
import React from "react";

// Định nghĩa cấu trúc dữ liệu từ file lesson.json để Type-safe
interface Scene {
  id: string;
  text: string;
  durationInSeconds: number;
  audioUrl?: string; // Tích hợp trường Audio sinh ra từ TTS
}

interface LessonProps {
  lessonTitle: string;
  scenes: Scene[];
}

// Component Animation Text siêu cấp đẹp trai
const AnimatedText: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hiệu ứng "nảy" (spring) cho chữ xuất hiện
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 10,
      stiffness: 100,
      mass: 0.5,
    },
  });

  // Hiệu ứng trượt lên (slide up) và mờ dần vào (fade in)
  const translateY = interpolate(frame, [0, 20], [50, 0], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        fontSize: 60,
        fontWeight: "bold",
        color: "#ffffff",
        textShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${scale}) translateY(${translateY}px)`,
        opacity,
        padding: "0 50px",
        boxSizing: "border-box",
      }}
    >
      {text}
    </div>
  );
};

// Component Animated Background đổi màu lãng tử
const AnimatedBackground: React.FC = () => {
  const frame = useCurrentFrame();

  // Xoay màu gradient tạo cảm giác vũ trụ bao la
  const color1 = interpolateColors(
    frame % 300,
    [0, 150, 300],
    ["#1a2a6c", "#b21f1f", "#1a2a6c"]
  );

  const color2 = interpolateColors(
    frame % 300,
    [0, 150, 300],
    ["#b21f1f", "#fdbb2d", "#b21f1f"]
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(45deg, ${color1}, ${color2})`,
        zIndex: 0, // Đảm bảo background nằm dưới chữ
      }}
    />
  );
};


// Component hiển thị nội dung chính của Video với Timeline động và Âm thanh
const MainVideo: React.FC<LessonProps> = ({ lessonTitle, scenes }) => {
  const { fps } = useVideoConfig();

  // Biến đếm frame bắt đầu cho từng scene
  let currentStartFrame = 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      {/* Background chuyển động */}
      <AnimatedBackground />

      {/* Tiêu đề cố định ở trên */}
      <div style={{ textAlign: "center", padding: 40, zIndex: 10, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
        <h1 style={{ fontSize: 40 }}>{lessonTitle}</h1>
      </div>

      {/* Vùng hiển thị động cho từng scene */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: 80,
          position: "relative",
          zIndex: 10,
        }}
      >
        {scenes.map((scene) => {
          // Tính toán chính xác độ dài khung hình của scene hiện tại (bao gồm cả độ dài mp3 vừa tính toán)
          const durationInFrames = Math.floor(scene.durationInSeconds * fps);

          // Lưu lại điểm bắt đầu của scene này để render
          const startFrame = currentStartFrame;

          // Cộng dồn để lấy điểm bắt đầu cho scene tiếp theo
          currentStartFrame += durationInFrames;

          return (
            <Sequence
              key={scene.id}
              from={startFrame}
              durationInFrames={durationInFrames}
            >
              <AnimatedText text={scene.text} />

              {/* Nếu script TTS đã tạo ra Audio URL, load nó vào Sequence để đồng bộ */}
              {scene.audioUrl && (
                 <Audio src={staticFile(scene.audioUrl)} />
              )}
            </Sequence>
          );
        })}
      </div>
    </div>
  );
};

// Cấu hình Thượng tầng hệ thống Remotion
export const RemotionRoot: React.FC = () => {
  const FPS = 30; // Cấu hình 30fps tối ưu tài nguyên máy ảo render năm 2026

  return (
    <>
      <Composition
        id="MyComposition" // ID phải khớp chính xác với lệnh gọi trong package.json
        component={MainVideo}
        fps={FPS}
        width={1920}  // Độ phân giải Ngang chuẩn bài giảng (Đổi thành 1080 nếu làm Shorts)
        height={1080} // Độ phân giải Dọc chuẩn bài giảng (Đổi thành 1920 nếu làm Shorts)
        
        // Khối logic dynamic frame: Tự động tính độ dài video dựa trên tổng durationInSeconds của JSON
        calculateMetadata={async ({ props }) => {
          const inputProps = props as LessonProps;
          
          // Tính tổng số giây của tất cả các scene cộng lại
          const totalSeconds = inputProps?.scenes?.reduce(
            (acc, scene) => acc + (scene.durationInSeconds || 0), 
            0
          ) || 10; // Mặc định 10 giây nếu data lỗi
          
          return {
            durationInFrames: Math.ceil(totalSeconds * FPS), // Chuyển đổi giây sang số Frames thực tế
            props: inputProps, // Chuyển tiếp dữ liệu sạch vào Component hiển thị
          };
        }}

        // Data dự phòng khi chạy dev mode không truyền tham số props
        defaultProps={{
          lessonTitle: "Giới thiệu về Remotion",
          scenes: [
            {
              id: "default_scene",
              text: "Hệ thống đang đợi file cấu hình lesson.json...",
              durationInSeconds: 5,
            },
          ],
        }}
      />
    </>
  );
};

// Đăng ký Root component với Remotion Engine để CLI tìm thấy điểm khởi chạy
registerRoot(RemotionRoot);