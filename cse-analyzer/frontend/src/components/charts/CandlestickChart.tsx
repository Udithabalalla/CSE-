import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
} from "lightweight-charts";
import type { OHLCVRow } from "../../types";

interface Overlay {
  label: string;
  values: { time: string; value: number }[];
  color: string;
}

interface Props {
  data: OHLCVRow[];
  overlays?: Overlay[];
  height?: number;
}

export default function CandlestickChart({ data, overlays = [], height = 400 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: true },
      width: containerRef.current.clientWidth,
      height,
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeries.setData(
      data.map((r) => ({
        time: r.date as unknown as import("lightweight-charts").Time,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
      }))
    );

    // Volume histogram in a separate pane
    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#3b82f680",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volSeries.setData(
      data.map((r) => ({
        time: r.date as unknown as import("lightweight-charts").Time,
        value: r.volume,
        color: r.close >= r.open ? "#22c55e40" : "#ef444440",
      }))
    );

    // Overlay lines (SMA, EMA, Bollinger, etc.)
    overlays.forEach((ov) => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: ov.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeries.setData(
        ov.values.map((v) => ({
          time: v.time as unknown as import("lightweight-charts").Time,
          value: v.value,
        }))
      );
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, overlays, height]);

  return <div ref={containerRef} style={{ width: "100%", borderRadius: 6, overflow: "hidden" }} />;
}
