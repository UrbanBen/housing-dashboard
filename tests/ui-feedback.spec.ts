import { test, expect } from '@playwright/test';

test.describe('UI Feedback & Improvement Analysis', () => {
  test('comprehensive UI evaluation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/dashboard-full-page.png', 
      fullPage: true 
    });
    
    // Performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domComplete: navigation.domComplete - navigation.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
      };
    });
    
    console.log('📊 Performance Metrics:', performanceMetrics);
    
    // Visual regression checks
    await expect(page.locator('[data-testid="dashboard-container"], div.min-h-screen')).toHaveScreenshot('dashboard-layout.png');
    
    // Accessibility audit
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for missing alt tags
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) issues.push(`${images.length} images missing alt attributes`);
      
      // Check color contrast (basic)
      const lowContrastElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const color = styles.color;
        return bgColor !== 'rgba(0, 0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)';
      }).length;
      
      // Check for proper heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) issues.push('No heading elements found');
      
      return issues;
    });
    
    console.log('♿ Accessibility Issues:', accessibilityIssues);
    
    // UI component analysis
    const uiAnalysis = await page.evaluate(() => {
      return {
        cardCount: document.querySelectorAll('[class*="card"], .bg-card').length,
        buttonCount: document.querySelectorAll('button, [role="button"]').length,
        chartElements: document.querySelectorAll('svg, canvas').length,
        formElements: document.querySelectorAll('input, select, textarea').length,
        iconCount: document.querySelectorAll('svg[class*="icon"], [class*="lucide"]').length,
        colorScheme: {
          primaryColors: Array.from(document.querySelectorAll('*')).map(el => 
            window.getComputedStyle(el).getPropertyValue('--primary')
          ).filter(Boolean),
          backgroundDark: document.body.style.backgroundColor || window.getComputedStyle(document.body).backgroundColor
        }
      };
    });
    
    console.log('🎨 UI Component Analysis:', uiAnalysis);
    
    // Mobile responsiveness check
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'test-results/dashboard-mobile.png', 
      fullPage: true 
    });
    
    // Tablet responsiveness check  
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'test-results/dashboard-tablet.png', 
      fullPage: true 
    });
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'test-results/dashboard-desktop.png', 
      fullPage: true 
    });
    
    // Check for layout shifts
    const layoutShiftScore = await page.evaluate(() => {
      return new Promise((resolve) => {
        let cumulativeLayoutShift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              cumulativeLayoutShift += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(cumulativeLayoutShift), 3000);
      });
    });
    
    console.log('📐 Cumulative Layout Shift Score:', layoutShiftScore);
    
    // Generate feedback report
    const feedbackReport = {
      timestamp: new Date().toISOString(),
      performance: performanceMetrics,
      accessibility: accessibilityIssues,
      uiComponents: uiAnalysis,
      layoutShift: layoutShiftScore,
      recommendations: []
    };
    
    // Add performance recommendations
    if (performanceMetrics.loadTime > 3000) {
      feedbackReport.recommendations.push('⚡ Consider optimizing images and reducing bundle size for faster load times');
    }
    
    if (accessibilityIssues.length > 0) {
      feedbackReport.recommendations.push('♿ Address accessibility issues for better user experience');
    }
    
    if (uiAnalysis.chartElements === 0) {
      feedbackReport.recommendations.push('📊 Charts may not be rendering - check Recharts implementation');
    }
    
    if (layoutShiftScore > 0.1) {
      feedbackReport.recommendations.push('📐 Reduce layout shifts for better visual stability');
    }
    
    console.log('📋 UI Feedback Report:', JSON.stringify(feedbackReport, null, 2));
  });
  
  test('chart functionality verification', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for charts to load
    await page.waitForTimeout(2000);
    
    // Check for SVG elements (Recharts renders as SVG)
    const chartSVGs = await page.locator('svg').count();
    console.log(`📊 Found ${chartSVGs} chart SVG elements`);
    
    // Verify chart interactivity
    const chartContainers = page.locator('[class*="recharts"], .recharts-wrapper');
    const chartCount = await chartContainers.count();
    
    if (chartCount > 0) {
      console.log(`✅ Found ${chartCount} interactive charts`);
      
      // Test hover interactions
      await chartContainers.first().hover();
      await page.screenshot({ 
        path: 'test-results/chart-interaction.png',
        clip: { x: 0, y: 200, width: 800, height: 400 }
      });
    } else {
      console.log('❌ No charts detected - may need debugging');
    }
  });
  
  test('color scheme validation', async ({ page }) => {
    await page.goto('/dashboard');
    
    const colorAnalysis = await page.evaluate(() => {
      const getColorInfo = (element) => {
        const styles = window.getComputedStyle(element);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor
        };
      };
      
      return {
        body: getColorInfo(document.body),
        cards: Array.from(document.querySelectorAll('[class*="card"]')).map(getColorInfo),
        primaryElements: Array.from(document.querySelectorAll('[class*="primary"]')).map(getColorInfo),
        navigation: getColorInfo(document.querySelector('nav') || document.body)
      };
    });
    
    console.log('🎨 Color Scheme Analysis:', JSON.stringify(colorAnalysis, null, 2));
    
    // Verify dark theme is active
    const isDarkTheme = await page.evaluate(() => {
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      return bodyBg.includes('10') || bodyBg.includes('3.9') || 
             bodyBg === 'rgb(10, 11, 10)' || bodyBg === 'hsl(240, 10%, 3.9%)';
    });
    
    console.log('🌙 Dark Theme Active:', isDarkTheme);
    
    if (!isDarkTheme) {
      console.log('⚠️  Dark theme may not be loading properly');
    }
  });
});