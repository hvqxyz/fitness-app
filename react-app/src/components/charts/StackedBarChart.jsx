import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './StackedBarChart.css';

export function StackedBarChart({
                                  labels,
                                  series,
                                  yAxisLabel,
                                  className = '',
                                }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const css = getComputedStyle(document.documentElement);

    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',

      data: {
        labels,
        datasets: series.map(({ label, data, color }) => ({
          label,
          data,
          backgroundColor: color,
          borderRadius: 5,
          borderSkipped: false,
          borderWidth: 0,
          barPercentage: 0.55,
          categoryPercentage: 0.7,
        })),
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: 'index',
          intersect: false,
        },

        layout: {
          padding: 8,
        },

        plugins: {
          legend: {
            position: 'bottom',

            labels: {
              color: css.getPropertyValue('--chart-axis').trim(),
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 16,
            },
          },

          tooltip: {
            displayColors: true,
            backgroundColor: css.getPropertyValue('--chart-tooltip-bg').trim(),
            borderColor: css.getPropertyValue('--chart-tooltip-border').trim(),
            borderWidth: 1,
            cornerRadius: 10,
          },
        },

        scales: {
          x: {
            stacked: true,

            grid: {
              display: false,
            },

            border: {
              display: false,
            },

            ticks: {
              color: css.getPropertyValue('--chart-axis').trim(),
              autoSkip: true,
              maxTicksLimit: 6,
            },
          },

          y: {
            stacked: true,
            beginAtZero: true,

            title: {
              display: Boolean(yAxisLabel),
              text: yAxisLabel,
              color: css.getPropertyValue('--chart-axis').trim(),
            },

            grid: {
              color: css.getPropertyValue('--chart-grid').trim(),
            },

            border: {
              display: false,
            },

            ticks: {
              color: css.getPropertyValue('--chart-axis').trim(),
              maxTicksLimit: 5,
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [labels, series, yAxisLabel]);

  return (
      <div className={`stacked-bar-chart ${className}`}>
        <canvas ref={canvasRef} />
      </div>
  );
}