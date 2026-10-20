import { ImageResponse } from "next/og";
import { Marca } from "@/components/Marca";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<div style={{ display: "flex" }}>{Marca({ size: 512 })}</div>, { ...size });
}
