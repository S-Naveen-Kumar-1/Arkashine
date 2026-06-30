const BASE_URL = 'http://localhost:8000';

// ==============================
// PDF REPORT URL BUILDER
// ==============================

export function buildPdfReportUrl(report) {
  const params = new URLSearchParams();
  const co2Offset = String(report.co2_offset ?? '0').replace(/[^0-9.-]/g, '');

  params.append('farmer_name', report.farmer_name || 'Arkashine Climate Partner');
  params.append('crop_type', report.crop_type || 'Crop');
  params.append('state', report.state || 'Unknown');
  params.append('soil_score', String(report.soil_score ?? 0));
  params.append('carbon_credits', String(report.carbon_credits ?? 0));
  params.append('esg_score', String(report.esg_score ?? 0));
  params.append(
    'sustainability_score',
    String(report.sustainability_score ?? report.esg_score ?? 0),
  );
  params.append(
    'yearly_projection',
    String(report.yearly_projection ?? report.total_yearly_projection ?? 0),
  );
  params.append('co2_offset', co2Offset || '0');
  params.append('verification_status', report.verification_status || 'AI VERIFIED');
  params.append('carbon_credit_potential', report.carbon_credit_potential || 'Medium');

  if (Array.isArray(report.recommendations)) {
    params.append('recommendations', report.recommendations.join('|'));
  }

  return `${BASE_URL}/pdf-report/?${params.toString()}`;
}

// ==============================
// CARBON CALCULATE
// ==============================

export function calculateCarbon(data) {
  return {
    type: 'CALCULATE_CARBON',
    payload: {
      request: {
        url: `${BASE_URL}/carbon/calculate`,
        method: 'POST',
        data,
      },
    },
  };
}

// ==============================
// AI RECOMMENDATIONS
// ==============================

export function analyzeFarm(data) {
  return {
    type: 'ANALYZE_FARM',
    payload: {
      request: {
        url: `${BASE_URL}/recommendations/`,
        method: 'POST',
        data,
      },
    },
  };
}

// ==============================
// RESET
// ==============================

export function resetCarbon() {
  return { type: 'CARBON_RESET' };
}

// ==============================
// MARKETPLACE
// ==============================

export function getMarketplace() {
  return {
    type: 'GET_MARKETPLACE',
    payload: {
      request: {
        url: `${BASE_URL}/marketplace/`,
        method: 'GET',
      },
    },
  };
}

// ==============================
// ANALYTICS HISTORY
// ==============================

export function getAnalyticsHistory() {
  return {
    type: 'GET_ANALYTICS_HISTORY',
    payload: {
      request: {
        url: `${BASE_URL}/analytics-history/`,
        method: 'GET',
      },
    },
  };
}

// ==============================
// CARBON HISTORY
// ==============================

export function getCarbonHistory() {
  return {
    type: 'GET_CARBON_HISTORY',
    payload: {
      request: {
        url: `${BASE_URL}/carbon-history/`,
        method: 'GET',
      },
    },
  };
}

// ==============================
// ANALYTICS SUMMARY
// ==============================

export function getAnalyticsSummary() {
  return {
    type: 'GET_ANALYTICS_SUMMARY',
    payload: {
      request: {
        url: `${BASE_URL}/analytics-summary/`,
        method: 'GET',
      },
    },
  };
}

// ==============================
// LIVE WEATHER
// ==============================

export function getWeather(city = 'Bangalore') {
  return {
    type: 'GET_WEATHER',
    payload: {
      request: {
        url: `${BASE_URL}/live-weather/${city}`,
        method: 'GET',
      },
    },
  };
}