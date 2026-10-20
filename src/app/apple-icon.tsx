import { ImageResponse } from "next/og";
import { Marca } from "@/components/Marca";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<div style={{ display: "flex" }}>{Marca({ size: 180 })}</div>, { ...size });
}
