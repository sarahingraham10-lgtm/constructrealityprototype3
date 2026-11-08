/* shared header and footer for the public website pages */
(function(){
  var pages=[['/','Home'],['/services.html','Services'],['/how-it-works.html','How it works'],['/about.html','About us'],['/faq.html','FAQ'],['/contact.html','Contact']];
  var here=location.pathname==='/index.html'?'/':location.pathname;
  var nav=pages.map(function(p){return '<a href="'+p[0]+'"'+(p[0]===here?' class="on"':'')+'>'+p[1]+'</a>'}).join('')+'<a href="/portal.html">Client portal</a><a href="/studio.html" class="cta">Design in VR</a>';
  var h=document.getElementById('site-top');if(h)h.outerHTML='<header class="top"><div class="wrap"><a href="/"><img src="/logo_white.png" alt="ConstructReality"></a><nav>'+nav+'</nav></div></header>';
  var f=document.getElementById('site-foot');
  if(f)f.outerHTML='<footer><div class="wrap"><div class="cols"><div><img src="/logo_white.png" alt="ConstructReality" style="height:30px;margin-bottom:10px"><p>Experience it. Understand it. Build with confidence.</p><p>Built in the Caribbean, for Caribbeans.</p></div>'+
  '<div><h4>Services</h4><a href="/services.html">What we do</a><a href="/how-it-works.html">How it works</a><a href="/studio.html">VR design studio</a><a href="/faq.html">FAQ</a></div>'+
  '<div><h4>Company</h4><a href="/about.html">About us</a><a href="/contact.html">Contact</a><a href="/terms.html">Terms of use</a><a href="/privacy.html">Privacy</a></div>'+
  '<div><h4>Sign in</h4><a href="/portal.html">Client portal</a><a href="/team">Team workspace</a></div></div>'+
  '<div class="sm">&copy; '+new Date().getFullYear()+' ConstructReality. Designs made with this service are concept drafts. A licensed architect, engineer and land surveyor must check and sign them before anything is built.</div></div></footer>';
})();
