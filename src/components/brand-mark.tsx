import Image from "next/image";

export default function BrandMark({ footer = false }: { footer?: boolean }) {
  return <Image
    src="/brand/rally-relic-color.png"
    alt=""
    width={72}
    height={72}
    sizes={footer ? "48px" : "(max-width: 680px) 54px, 68px"}
    loading={footer ? "lazy" : "eager"}
    className={`brand-mark${footer ? " brand-mark-footer" : ""}`}
  />;
}
