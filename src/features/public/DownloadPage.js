import { logToolUsage } from '../../services/analytics-service.js';

export function render(root) {
  root.innerHTML = `
    <style>
      @keyframes gradientBG {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-15px); }
        100% { transform: translateY(0px); }
      }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
        70% { box-shadow: 0 0 0 20px rgba(234, 179, 8, 0); }
        100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
      }
      .download-page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: linear-gradient(-45deg, #0f172a, #1e1b4b, #172554, #0f172a);
        background-size: 400% 400%;
        animation: gradientBG 15s ease infinite;
        color: #fff;
        font-family: system-ui, -apple-system, sans-serif;
        overflow-x: hidden;
      }
      .glass-panel {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 28px;
        box-shadow: 0 24px 48px rgba(0,0,0,0.25);
      }
      .btn-download {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: linear-gradient(135deg, #facc15, #eab308);
        color: #000;
        font-weight: 800;
        font-size: 18px;
        padding: 18px 40px;
        border-radius: 999px;
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: pulse 2s infinite;
        border: none;
        cursor: pointer;
        width: 100%;
        max-width: 340px;
      }
      .btn-download:hover {
        transform: translateY(-4px) scale(1.03);
        box-shadow: 0 16px 32px rgba(234, 179, 8, 0.3);
      }
      .btn-download:active {
        transform: translateY(1px);
      }
      .feature-card {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .feature-card:hover {
        transform: translateY(-8px);
        background: rgba(255,255,255,0.06);
        border-color: rgba(234, 179, 8, 0.4);
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      }
      .testimonial-card {
        background: rgba(255,255,255,0.02);
        border-radius: 20px;
        padding: 32px;
        border: 1px solid rgba(255,255,255,0.05);
        position: relative;
        transition: all 0.3s ease;
      }
      .testimonial-card:hover {
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.1);
      }
      .quote-icon {
        position: absolute;
        top: 24px;
        right: 24px;
        font-size: 60px;
        color: rgba(255,255,255,0.04);
        font-family: Georgia, serif;
        line-height: 1;
      }
    </style>
    
    <div class="download-page">
      <!-- Navbar -->
      <header style="padding:24px 48px;display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.15);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="/logo-new.png" alt="EduSync Logo" style="width:44px;height:44px;border-radius:14px;background:white;padding:2px;box-shadow:0 4px 12px rgba(0,0,0,0.4);" />
          <span style="font-size:24px;font-weight:800;letter-spacing:-0.02em;background:linear-gradient(to right, #fff, #94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">EduSync</span>
        </div>
        <div>
          <a href="#/login" style="color:#eab308;text-decoration:none;font-weight:700;font-size:15px;padding:10px 20px;border-radius:999px;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.2);transition:all 0.2s;" onmouseover="this.style.background='rgba(234,179,8,0.2)';this.style.transform='translateY(-1px)';" onmouseout="this.style.background='rgba(234,179,8,0.1)';this.style.transform='none';">Web Login &rarr;</a>
        </div>
      </header>

      <!-- Main Content -->
      <main style="flex:1;display:flex;flex-direction:column;align-items:center;padding:100px 24px;position:relative;">
        
        <!-- Background decorative blur elements -->
        <div style="position:absolute;top:10%;left:10%;width:400px;height:400px;background:#eab308;border-radius:50%;filter:blur(150px);opacity:0.15;z-index:0;animation:float 8s ease-in-out infinite;"></div>
        <div style="position:absolute;bottom:20%;right:5%;width:500px;height:500px;background:#3b82f6;border-radius:50%;filter:blur(180px);opacity:0.12;z-index:0;animation:float 10s ease-in-out infinite reverse;"></div>

        <div style="text-align:center;max-width:760px;position:relative;z-index:1;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16, 185, 129, 0.1);color:#34d399;padding:8px 20px;border-radius:999px;font-weight:700;font-size:15px;margin-bottom:32px;border:1px solid rgba(16, 185, 129, 0.25);box-shadow:0 8px 16px rgba(16, 185, 129, 0.1);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            100% Safe & Play Protect Verified
          </div>
          
          <h1 style="font-size:clamp(3.5rem, 8vw, 5rem);font-weight:900;line-height:1.05;margin-bottom:28px;letter-spacing:-0.03em;text-shadow:0 10px 30px rgba(0,0,0,0.5);">
            Take EduSync <br/><span style="background:linear-gradient(135deg, #fef08a, #eab308);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Anywhere.</span>
          </h1>
          <p style="font-size:22px;color:#94a3b8;margin-bottom:64px;line-height:1.6;font-weight:400;text-shadow:0 2px 10px rgba(0,0,0,0.5);">
            Join hundreds of students using the official Android app to master their exams, timetables, and attendance on the go.
          </p>

          <!-- Download Card -->
          <div class="glass-panel" style="padding:56px 40px;position:relative;overflow:hidden;transform-style:preserve-3d;perspective:1000px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:32px;margin-bottom:40px;flex-wrap:wrap;">
              <div style="position:relative;">
                <img src="/logo-new.png" alt="EduSync App Icon" style="width:110px;height:110px;border-radius:28px;background:white;padding:10px;box-shadow:0 16px 40px rgba(0,0,0,0.4);position:relative;z-index:2;" />
                <div style="position:absolute;inset:-10px;background:#eab308;filter:blur(30px);opacity:0.3;z-index:1;border-radius:50%;"></div>
              </div>
              <div style="text-align:left;">
                <h2 style="font-size:32px;font-weight:800;margin-bottom:16px;letter-spacing:-0.02em;">EduSync for Android</h2>
                <div style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;font-size:15px;color:#cbd5e1;font-weight:600;">
                  <span style="background:rgba(234,179,8,0.15);color:#facc15;padding:6px 14px;border-radius:999px;border:1px solid rgba(234,179,8,0.3);">v1.0.0</span>
                  <span style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:6px 14px;border-radius:999px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 2.1 MB</span>
                  <span style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:6px 14px;border-radius:999px;color:#fbbf24;">⭐ 4.9/5 Rating</span>
                </div>
              </div>
            </div>

            <button id="dl-btn" class="btn-download" onclick="startDownload()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Download APK Free</span>
            </button>
            
            <!-- Hidden real link triggered by JS -->
            <a id="real-dl-link" href="/edusync-app.apk" download style="display:none;"></a>

            <div style="margin-top:32px;display:flex;align-items:center;justify-content:center;gap:32px;font-size:15px;color:#94a3b8;font-weight:500;flex-wrap:wrap;">
              <span style="display:flex;align-items:center;gap:8px;"><svg style="color:#10b981" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Virus-free</span>
              <span style="display:flex;align-items:center;gap:8px;"><svg style="color:#10b981" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> No Ads</span>
              <span style="display:flex;align-items:center;gap:8px;"><svg style="color:#10b981" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Fast Install</span>
            </div>
          </div>
        </div>

        <!-- Social Proof / Testimonials -->
        <div style="margin-top:120px;max-width:1000px;width:100%;position:relative;z-index:1;">
          <h3 style="text-align:center;font-size:32px;font-weight:800;margin-bottom:56px;letter-spacing:-0.02em;">Loved by Top Students</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:32px;">
            <div class="testimonial-card">
              <div class="quote-icon">"</div>
              <div style="display:flex;gap:4px;color:#facc15;margin-bottom:16px;">★★★★★</div>
              <p style="font-size:17px;color:#cbd5e1;line-height:1.6;margin-bottom:24px;">"The offline timetable access saved me when the college Wi-Fi was down. Notifications for exams are perfectly timed, adding to calendar directly is a lifesaver!"</p>
              <div style="display:flex;align-items:center;gap:16px;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, #3b82f6, #2563eb);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:20px;">A</div>
                <div>
                  <div style="font-weight:700;font-size:16px;color:#fff;">Aravind P.</div>
                  <div style="font-size:14px;color:#94a3b8;">Computer Science</div>
                </div>
              </div>
            </div>
            <div class="testimonial-card">
              <div class="quote-icon">"</div>
              <div style="display:flex;gap:4px;color:#facc15;margin-bottom:16px;">★★★★★</div>
              <p style="font-size:17px;color:#cbd5e1;line-height:1.6;margin-bottom:24px;">"Native speed is incredible. Much faster than logging in through the browser every time. It just feels premium and keeps me incredibly organized."</p>
              <div style="display:flex;align-items:center;gap:16px;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, #facc15, #eab308);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:20px;color:#000;">S</div>
                <div>
                  <div style="font-weight:700;font-size:16px;color:#fff;">Sarah M.</div>
                  <div style="font-size:14px;color:#94a3b8;">Information Tech</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Features Grid -->
        <div style="margin-top:120px;max-width:1100px;width:100%;position:relative;z-index:1;">
          <h3 style="text-align:center;font-size:32px;font-weight:800;margin-bottom:56px;letter-spacing:-0.02em;">Why Install the App?</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:32px;">
            <div class="glass-panel feature-card" style="padding:40px;text-align:left;">
              <div style="width:64px;height:64px;border-radius:20px;background:rgba(59, 130, 246, 0.15);color:#60a5fa;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:24px;border:1px solid rgba(59,130,246,0.2);">🚀</div>
              <h4 style="font-size:22px;font-weight:700;margin-bottom:12px;color:#fff;">Lightning Fast</h4>
              <p style="font-size:16px;color:#94a3b8;line-height:1.6;">Native rendering provides a buttery smooth and instantaneous experience compared to web interfaces.</p>
            </div>
            <div class="glass-panel feature-card" style="padding:40px;text-align:left;">
              <div style="width:64px;height:64px;border-radius:20px;background:rgba(234, 179, 8, 0.15);color:#facc15;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:24px;border:1px solid rgba(234,179,8,0.2);">🔔</div>
              <h4 style="font-size:22px;font-weight:700;margin-bottom:12px;color:#fff;">Smart Alerts</h4>
              <p style="font-size:16px;color:#94a3b8;line-height:1.6;">Get reliable native push notifications for timetable changes, announcements, and GPA updates instantly.</p>
            </div>
            <div class="glass-panel feature-card" style="padding:40px;text-align:left;">
              <div style="width:64px;height:64px;border-radius:20px;background:rgba(16, 185, 129, 0.15);color:#34d399;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:24px;border:1px solid rgba(16,185,129,0.2);">📱</div>
              <h4 style="font-size:22px;font-weight:700;margin-bottom:12px;color:#fff;">Offline Mode</h4>
              <p style="font-size:16px;color:#94a3b8;line-height:1.6;">View your cached timetable and attendance data anywhere, even when you have no signal or Wi-Fi.</p>
            </div>
          </div>
        </div>

        <!-- Installation Guide -->
        <div style="margin-top:120px;max-width:860px;width:100%;position:relative;z-index:1;">
          <div class="glass-panel" style="padding:64px;display:flex;flex-direction:column;align-items:center;">
            <h3 style="font-size:32px;font-weight:800;margin-bottom:48px;text-align:center;letter-spacing:-0.02em;">How to Install in 3 Steps</h3>
            <div style="display:flex;flex-direction:column;gap:32px;width:100%;max-width:600px;">
              
              <div style="display:flex;gap:24px;align-items:flex-start;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(234,179,8,0.15);color:#facc15;border:1px solid rgba(234,179,8,0.3);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0;">1</div>
                <div>
                  <h4 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#fff;">Download the File</h4>
                  <p style="font-size:16px;color:#94a3b8;line-height:1.6;">Click the download button above and save the secure APK file to your device.</p>
                </div>
              </div>
              
              <div style="display:flex;gap:24px;align-items:flex-start;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(234,179,8,0.15);color:#facc15;border:1px solid rgba(234,179,8,0.3);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0;">2</div>
                <div>
                  <h4 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#fff;">Allow Unknown Sources</h4>
                  <p style="font-size:16px;color:#94a3b8;line-height:1.6;">Open the downloaded file. If prompted by Android security, go to Settings and toggle <span style="color:#cbd5e1;font-weight:600;">"Allow from this source"</span>.</p>
                </div>
              </div>
              
              <div style="display:flex;gap:24px;align-items:flex-start;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(234,179,8,0.15);color:#facc15;border:1px solid rgba(234,179,8,0.3);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0;">3</div>
                <div>
                  <h4 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#fff;">Install & Launch</h4>
                  <p style="font-size:16px;color:#94a3b8;line-height:1.6;">Tap Install and wait a few seconds. Launch EduSync directly from your app drawer!</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Feedback Section -->
        <div style="margin-top:120px;max-width:860px;width:100%;position:relative;z-index:1;margin-bottom:40px;">
          <div class="glass-panel" style="padding:48px;display:flex;flex-direction:column;align-items:center;background:rgba(59, 130, 246, 0.05);border-color:rgba(59, 130, 246, 0.2);">
            <div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg, #3b82f6, #2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:24px;box-shadow:0 12px 24px rgba(59, 130, 246, 0.3);">
              💬
            </div>
            <h3 style="font-size:28px;font-weight:800;margin-bottom:16px;text-align:center;letter-spacing:-0.02em;">We Value Your Feedback!</h3>
            <p style="font-size:16px;color:#cbd5e1;line-height:1.6;text-align:center;max-width:500px;margin-bottom:32px;">
              Your thoughts help us improve EduSync. Did the app help you? Is there a feature you'd love to see? Let us know!
            </p>
            <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSelc0s6bqtjJ3IFp8Ckv2flGScOHjOz3GSERGsC0gQv-DLRjA/viewform?usp=dialog" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:10px;background:#3b82f6;color:#fff;font-weight:700;font-size:16px;padding:14px 28px;border-radius:999px;text-decoration:none;transition:all 0.2s;box-shadow:0 8px 16px rgba(59, 130, 246, 0.3);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 24px rgba(59, 130, 246, 0.4)';" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 16px rgba(59, 130, 246, 0.3)';">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 8 9"></polyline></svg>
                Fill Feedback Form
              </a>
            </div>
          </div>
        </div>

      </main>

      <!-- Footer / Feedback -->
      <footer style="padding:64px 24px;text-align:center;background:rgba(0,0,0,0.4);position:relative;z-index:1;border-top:1px solid rgba(255,255,255,0.05);backdrop-filter:blur(20px);">
        <h4 style="font-size:20px;font-weight:700;margin-bottom:16px;color:#fff;">Need Help or Have Feedback?</h4>
        <p style="font-size:16px;color:#94a3b8;margin-bottom:40px;">If you encounter any issues during installation, our developer is ready to help.</p>
        <a href="mailto:chandruk.dev@gmail.com" style="display:inline-flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);padding:16px 32px;border-radius:999px;color:#fff;text-decoration:none;font-weight:600;font-size:16px;border:1px solid rgba(255,255,255,0.1);transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 20px rgba(0,0,0,0.2)';" onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.transform='none';this.style.boxShadow='none';">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          Contact Developer
        </a>
      </footer>

    </div>
  `;

  // Add interactive JS logic for the button
  window.startDownload = function() {
    const btn = document.getElementById('dl-btn');
    const originalContent = btn.innerHTML;
    
    // Disable temporarily
    btn.style.pointerEvents = 'none';
    btn.style.background = 'rgba(255,255,255,0.1)';
    btn.style.color = '#fff';
    btn.style.animation = 'none';
    btn.style.boxShadow = 'none';
    btn.innerHTML = `<span class="spinner" style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite;"></span> <span style="font-size:18px;">Scanning...</span>`;
    
    // Add keyframes if not exists
    if (!document.getElementById('dl-styles')) {
      const style = document.createElement('style');
      style.id = 'dl-styles';
      style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="font-size:18px;">Download Started</span>`;
      
      // Trigger actual download from Supabase Storage
      const a = document.createElement('a');
      a.href = "https://jzvtcdamuddogcnqdxut.supabase.co/storage/v1/object/public/releases/edusync-app.apk";
      a.download = "edusync-app.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      try { logToolUsage('App Download', 'downloaded'); } catch(e) {}
      
      setTimeout(() => {
        // Reset button
        btn.style.pointerEvents = 'auto';
        btn.style.background = 'linear-gradient(135deg, #facc15, #eab308)';
        btn.style.color = '#000';
        btn.style.animation = 'pulse 2s infinite';
        btn.innerHTML = originalContent;
      }, 4000);
      
    }, 1500);
  };
}
