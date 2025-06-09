import React, { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import DattaModal from './DattaModal';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function HistoryChartModal({ label, dataByYear, onClose }) {
  const years = Object.keys(dataByYear).sort((a, b) => b - a);
  const [year, setYear] = useState(years[0]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      height: 350,
      background: 'transparent',
      fontFamily: 'var(--pc-font-family)',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '65%',
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '12px',
        fontWeight: '600',
        colors: ['var(--current-text-primary)']
      },
      formatter: function (val) {
        return val || val === 0 ? val : '';
      }
    },
    xaxis: {
      categories: MONTHS,
      labels: {
        style: {
          colors: 'var(--current-text-secondary)',
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'var(--current-text-secondary)',
          fontSize: '12px'
        }
      },
      title: {
        text: label,
        style: {
          color: 'var(--current-text-secondary)',
          fontSize: '13px',
          fontWeight: '500'
        }
      }
    },
    grid: {
      borderColor: 'var(--current-border-light)',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false
        }
      }
    },
    colors: ['var(--pc-primary)'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['var(--pc-primary-light)'],
        inverseColors: false,
        opacityFrom: 0.9,
        opacityTo: 0.7
      }
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'var(--pc-font-family)'
      },
      y: {
        formatter: function (val) {
          return val !== null && val !== undefined ? val : 'Aucune donnée';
        }
      }
    },
    responsive: [{
      breakpoint: 768,
      options: {
        plotOptions: {
          bar: {
            columnWidth: '80%'
          }
        }
      }
    }]
  }), [label]);

  const series = useMemo(() => [{
    name: label,
    data: dataByYear[year] || Array(12).fill(null)
  }], [dataByYear, year, label]);

  return (
    <DattaModal open onClose={onClose} title="Historique des données" size="lg">
      <div className="p-4">
        {/* Sélecteur d'année moderne */}
        {years.length > 1 && (
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0 text-muted">
                <i className="feather icon-calendar me-2"></i>
                Période d'analyse
              </h6>
              <div className="btn-group" role="group">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`btn ${year === y ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                    onClick={() => setYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Titre avec statistiques rapides */}
        <div className="mb-3">
          <h5 className="mb-1">{label}</h5>
          <small className="text-muted">
            Évolution mensuelle pour l'année {year}
          </small>
        </div>

        {/* Graphique */}
        <div style={{ height: '400px' }}>
          <Chart
            options={chartOptions}
            series={series}
            type="bar"
            height="100%"
          />
        </div>

        {/* Statistiques en bas */}
        <div className="mt-3 p-3 bg-light rounded">
          <div className="row text-center">
            <div className="col-4">
              <small className="text-muted d-block">Maximum</small>
              <strong className="text-success">
                {Math.max(...(dataByYear[year] || []).filter(v => v !== null)) || 0}
              </strong>
            </div>
            <div className="col-4">
              <small className="text-muted d-block">Minimum</small>
              <strong className="text-danger">
                {Math.min(...(dataByYear[year] || []).filter(v => v !== null)) || 0}
              </strong>
            </div>
            <div className="col-4">
              <small className="text-muted d-block">Moyenne</small>
              <strong className="text-primary">
                {(() => {
                  const values = (dataByYear[year] || []).filter(v => v !== null);
                  return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                })()}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </DattaModal>
  );
}
