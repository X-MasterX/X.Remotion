import {
  Composition,
  registerRoot,
  Sequence,
  useVideoConfig,
  Audio,
  staticFile,
  spring,
  interpolate,
  interpolateColors,
  useCurrentFrame,
  delayRender,
  continueRender
} from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import React, { useState, useEffect } from "react";

// Nếu có skia, có thể import nhưng vì font custom đơn giản nên ta có thể dùng CSS filter text-stroke hoặc shadow
// Tuy nhiên yêu cầu sử dụng Skia cho typography hoạt hình.
// Nếu chưa có file skia component cụ thể, sử dụng SVG hoặc Skia path.
// Để giữ tính ổn định, sẽ dùng Skia để tạo stroke chữ nếu bạn đã cài.
// Ở đây tôi sẽ sử dụng mix giữa html text và bóng (shadow), audio reactive.

interface Scene {
  id: string;
  text: string;
  durationInSeconds: number;
  audioUrl?: string;
}

interface LessonProps {
  lessonTitle: string;
  scenes: Scene[];
}

const AudioReactiveText: React.FC<{
  text: string;
  audioUrl?: string;
  translateY: number;
  opacity: number;
}> = ({ text, audioUrl, translateY, opacity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // CODE CHUẨN (Bắt buộc phải có delayRender)
  const [handle] = useState(() => delayRender("Đang tải dữ liệu âm thanh..."));
  const audioData = useAudioData(audioUrl ? staticFile(audioUrl) : "");

  useEffect(() => {
    if (!audioUrl) {
      continueRender(handle);
      return;
    }
    if (audioData) {
      continueRender(handle); // Chỉ cho phép render tiếp khi audio đã load xong
    }
  }, [audioData, handle, audioUrl]);

  let scale = 1;
  let glow = 0;

  if (audioData) {
    const visualization = visualizeAudio({
      fps,
      frame,
      audioData,
      numberOfSamples: 16,
    });

    // Tính trung bình cường độ âm thanh
    const sum = visualization.reduce((a, b) => a + b, 0);
    const avg = sum / visualization.length;

    // Scale chữ nhẹ nhàng theo âm thanh
    scale = interpolate(avg, [0, 0.2], [1, 1.15], {
      extrapolateRight: "clamp",
    });

    glow = interpolate(avg, [0, 0.2], [0, 20], {
      extrapolateRight: "clamp",
    });
  } else {
    scale = interpolate(Math.sin(frame / 15), [-1, 1], [0.98, 1.02]);
  }

  // Chia text thành các từ để tạo animation nảy nảy nếu muốn, hoặc hiển thị nguyên block
  return (
    <h2
      style={{
        fontSize: 60,
        color: "#ffffff",
        textAlign: "center",
        textShadow: `0 0 ${glow}px #f39c12, 4px 4px 0px #e74c3c, -2px -2px 0px #2c3e50`,
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        lineHeight: 1.5,
        fontWeight: 900,
        fontFamily: "'Fredoka One', 'Comic Sans MS', sans-serif", // Kids style
        WebkitTextStroke: "2px #000",
      }}
    >
      {text}
    </h2>
  );
};

const SceneComponent: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Squash & Stretch, Elastic physics: mass: 0.4, stiffness: 120, damping: 10
  const enterProgress = spring({
    frame,
    fps,
    config: { mass: 0.4, stiffness: 120, damping: 10 },
  });

  const translateY = interpolate(enterProgress, [0, 1], [150, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: "0 100px",
        boxSizing: "border-box",
      }}
    >
      <AudioReactiveText
        text={scene.text}
        audioUrl={scene.audioUrl}
        translateY={translateY}
        opacity={opacity}
      />
    </div>
  );
};

// Decorate sticker using pure CSS to avoid missing Lottie JSONs
const DecoratorSticker: React.FC<{ delay: number; emoji: string; style?: React.CSSProperties }> = ({ delay, emoji, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame: frame - delay,
    fps,
    config: { mass: 0.4, stiffness: 120, damping: 10 },
  });

  const scale = interpolate(pop, [0, 1], [0, 1]);
  const rotation = interpolate(pop, [0, 1], [-45, 15]);

  return (
    <div style={{
      position: "absolute",
      fontSize: 100,
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      ...style
    }}>
      {emoji}
    </div>
  );
};


const MainVideo: React.FC<LessonProps> = ({ lessonTitle, scenes }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Đổi màu nền sặc sỡ (Tone màu biển sâu vui tươi)
  const bgProgress = (frame % (fps * 10)) / (fps * 10); // Loop every 10s
  const backgroundColor = interpolateColors(
    bgProgress,
    [0, 0.33, 0.66, 1],
    ["#0f4c75", "#3282b8", "#1b262c", "#0f4c75"]
  );

  let currentStartFrame = 0;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor,
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <DecoratorSticker delay={10} emoji="🦈" style={{ top: 100, left: 100 }} />
      <DecoratorSticker delay={30} emoji="🐢" style={{ bottom: 150, right: 150 }} />
      <DecoratorSticker delay={50} emoji="🐙" style={{ top: 200, right: 100 }} />
      <DecoratorSticker delay={90} emoji="🦀" style={{ bottom: 100, left: 200 }} />

      {/* Tiêu đề xịn xò */}
      <div style={{
        textAlign: "center",
        padding: "40px",
        zIndex: 10,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 70,
          background: "-webkit-linear-gradient(#00f2fe, #4facfe)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(3px 5px 2px rgba(0,0,0,0.5))",
          WebkitTextStroke: "1px #000",
        }}>
          {lessonTitle}
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {scenes.map((scene) => {
          const durationInFramesScene = Math.floor((scene.durationInSeconds || 5) * fps);
          const startFrame = currentStartFrame;
          currentStartFrame += durationInFramesScene;

          return (
            <Sequence
              key={scene.id}
              from={startFrame}
              durationInFrames={durationInFramesScene}
            >
              <SceneComponent scene={scene} />
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

export const RemotionRoot: React.FC = () => {
  const FPS = 30;

  return (
    <>
      <Composition
        id="MyComposition"
        component={MainVideo}
        fps={FPS}
        width={1920}
        height={1080}
        calculateMetadata={async ({ props }) => {
          const inputProps = props as LessonProps;
          
          const totalSeconds = inputProps?.scenes?.reduce(
            (acc, scene) => acc + (scene.durationInSeconds || 0), 
            0
          ) || 10;
          
          return {
            durationInFrames: Math.ceil(totalSeconds * FPS),
            props: inputProps,
          };
        }}
        defaultProps={{
          lessonTitle: "Khám Phá Đại Dương Cùng Cá Mập Nhỏ",
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

registerRoot(RemotionRoot);
