export function ThemeScript() {
  const code = `(function(){try{var m=document.cookie.match(/(?:^|; )trackly-theme=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";if(p!=="light"&&p!=="dark")p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",p);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
