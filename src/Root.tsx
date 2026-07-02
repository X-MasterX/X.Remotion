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
  useCurrentFrame
} from "remotion";
import React from "react";

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

// Component cho từng Scene để dễ quản lý animation
const SceneComponent: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animation mượt mà cho việc xuất hiện: trượt từ dưới lên và mờ dần vào
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.8 },
  });

  const translateY = interpolate(enterProgress, [0, 1], [50, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // Animation nhỏ bé nhịp thở (scale mượt suốt thời gian của scene)
  const scale = interpolate(
    Math.sin(frame / 15),
    [-1, 1],
    [0.98, 1.02]
  );

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
      <h2
        style={{
          fontSize: 60,
          color: "#ffffff",
          textAlign: "center",
          textShadow: "2px 2px 10px rgba(0, 0, 0, 0.5)",
          transform: `translateY(${translateY}px) scale(${scale})`,
          opacity,
          lineHeight: 1.5,
          fontWeight: "bold",
        }}
      >
        {scene.text}
      </h2>
    </div>
  );
};

const MainVideo: React.FC<LessonProps> = ({ lessonTitle, scenes }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Hình nền động: đổi màu chậm rãi theo thời gian
  const bgProgress = frame / durationInFrames;
  const backgroundColor = interpolateColors(
    bgProgress,
    [0, 0.5, 1],
    ["#1a1a2e", "#16213e", "#0f3460"]
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
      {/* Tiêu đề xịn xò */}
      <div style={{
        textAlign: "center",
        padding: "40px",
        zIndex: 10,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 80,
          background: "-webkit-linear-gradient(#f39c12, #e74c3c)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))"
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
          const durationInFramesScene = Math.floor(scene.durationInSeconds * fps);
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

registerRoot(RemotionRoot);
