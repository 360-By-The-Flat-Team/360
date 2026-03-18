(function(opts_){/*

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
'use strict';var f=this||self;function g(a){return a};var h;function k(a,b){this.h=a===l&&b||"";this.g=m}function n(a){return a instanceof k&&a.constructor===k&&a.g===m?a.h:"type_error:Const"}var m={},l={};function p(a,b){this.h=b===q?a:""}p.prototype.toString=function(){return this.h+""};function r(a){return a instanceof p&&a.constructor===p?a.h:"type_error:TrustedResourceUrl"}
function u(a,b){var c=n(a);if(!v.test(c))throw Error("Invalid TrustedResourceUrl format: "+c);a=c.replace(w,function(d,e){if(!Object.prototype.hasOwnProperty.call(b,e))throw Error('Found marker, "'+e+'", in format string, "'+c+'", but no valid label mapping found in args: '+JSON.stringify(b));d=b[e];return d instanceof k?n(d):encodeURIComponent(String(d))});return x(a)}var w=/%{(\w+)}/g,v=RegExp("^((https:)?//[0-9a-z.:[\\]-]+/|/[^/\\\\]|[^:/\\\\%]+/|[^:/\\\\%]*[?#]|about:blank#)","i"),y=/^([^?#]*)(\?[^#]*)?(#[\s\S]*)?/;
function z(a){var b=A;a=u(B,a);a=y.exec(r(a).toString());var c=a[3]||"";return x(a[1]+C("?",a[2]||"",b)+C("#",c))}var q={};function x(a){if(void 0===h){var b=null;var c=f.trustedTypes;if(c&&c.createPolicy){try{b=c.createPolicy("goog#html",{createHTML:g,createScript:g,createScriptURL:g})}catch(d){f.console&&f.console.error(d.message)}h=b}else h=b}a=(b=h)?b.createScriptURL(a):a;return new p(a,q)}
function C(a,b,c){if(null==c)return b;if("string"===typeof c)return c?a+encodeURIComponent(c):"";for(var d in c)if(Object.prototype.hasOwnProperty.call(c,d)){var e=c[d];e=Array.isArray(e)?e:[e];for(var t=0;t<e.length;t++){var D=e[t];null!=D&&(b||(b=a),b+=(b.length>a.length?"&":"")+encodeURIComponent(d)+"="+encodeURIComponent(String(D)))}}return b};function E(a,b){this.g=b===F?a:""}E.prototype.toString=function(){return this.g.toString()};var F={};/*

 SPDX-License-Identifier: Apache-2.0
*/
var G;try{new URL("s://g"),G=!0}catch(a){G=!1}var H=G;var I="alternate author bookmark canonical cite help icon license next prefetch dns-prefetch prerender preconnect preload prev search subresource".split(" ");var J=new k(l,"https://www.google.com/cse/static/style/look/%{versionDir}%{versionSlash}%{theme}.css"),K=new k(l,"https://www.google.com/cse/static/element/%{versionDir}%{versionSlash}default%{experiment}+%{lang}.css"),B=new k(l,"https://www.google.com/cse/static/element/%{versionDir}%{versionSlash}cse_element__%{lang}.js"),L=new k(l,"/");window.__gcse=window.__gcse||{};window.__gcse.ct=Date.now();
window.__gcse.scb=function(){var a=window.__gcse;M()||delete opts_.rawCss;var b=N(a.initializationCallback||a.callback);google.search.cse.element.init(opts_)&&("explicit"!==a.parsetags?"complete"===document.readyState||"interactive"===document.readyState?(google.search.cse.element.go(),null==b||b()):google.setOnLoadCallback(function(){google.search.cse.element.go();null==b||b()},!0):null==b||b())};
function N(a){if("function"===typeof a)return a;if("string"!==typeof a)return null;a=window[a];return"function"!==typeof a?null:a}function M(){var a;return!(null==(a=window.__gcse)?0:a.plainStyle)}
function O(a){var b=document.createElement("link");b.type="text/css";a:{if(a instanceof p)b.href=r(a).toString();else{if(-1===I.indexOf("stylesheet"))throw Error('TrustedResourceUrl href attribute required with rel="stylesheet"');if(a instanceof E)a=a instanceof E&&a.constructor===E?a.g:"type_error:SafeUrl";else{c:if(H){try{var c=new URL(a)}catch(d){c="https:";break c}c=c.protocol}else d:{c=document.createElement("a");try{c.href=a}catch(d){c=void 0;break d}c=c.protocol;c=":"===c||""===c?"https:":
c}a="javascript:"!==c?a:void 0}if(void 0===a)break a;b.href=a}b.rel="stylesheet"}return b};var P,A=opts_.usqp?{usqp:opts_.usqp}:{},Q=opts_.language.toLowerCase();P=opts_.cselibVersion?z({versionDir:opts_.cselibVersion,versionSlash:L,lang:Q}):z({versionDir:"",versionSlash:"",lang:Q});var R=window.__gcse.scb,S=document.createElement("script");S.src=r(P);var T,U,V,W=null==(V=(U=(S.ownerDocument&&S.ownerDocument.defaultView||window).document).querySelector)?void 0:V.call(U,"script[nonce]");(T=W?W.nonce||W.getAttribute("nonce")||"":"")&&S.setAttribute("nonce",T);S.type="text/javascript";
R&&(S.onload=R);document.getElementsByTagName("head")[0].appendChild(S);
if(M()){document.getElementsByTagName("head")[0].appendChild(O(opts_.cselibVersion?u(K,{versionDir:opts_.cselibVersion,versionSlash:L,experiment:opts_.uiOptions.cssThemeVersion&&4!==opts_.uiOptions.cssThemeVersion?"_v"+opts_.uiOptions.cssThemeVersion:"",lang:opts_.language}):u(K,{versionDir:"",versionSlash:"",experiment:"",lang:opts_.language})));var X,Y="v"+(opts_.uiOptions.cssThemeVersion||4);X=u(J,{versionDir:Y,versionSlash:Y?L:"",theme:opts_.theme.toLowerCase().replace("v2_","")});document.getElementsByTagName("head")[0].appendChild(O(X))};
})({
  "cx": "e003eb0834b6b4be8",
  "language": "en",
  "theme": "MINIMALIST",
  "uiOptions": {
    "resultsUrl": "",
    "enableAutoComplete": true,
    "enableImageSearch": true,
    "imageSearchLayout": "popup",
    "resultSetSize": "filtered_cse",
    "enableOrderBy": true,
    "orderByOptions": [{
      "label": "Relevance",
      "key": ""
    }, {
      "label": "Date",
      "key": "date"
    }],
    "overlayResults": false,
    "webSearchResultSetSize": 0,
    "webSearchExtendedRestricts": {
      "lr": "",
      "cr": "",
      "gl": "",
      "filter": 0,
      "sort": "",
      "as_oq": "",
      "as_sitesearch": ""
    },
    "queryParameterName": "q",
    "enableHistory": true,
    "numTopRefinements": -1,
    "enableRichSnippets": false,
    "hideElementBranding": true,
    "cssThemeVersion": 6,
    "isSafeSearchActive": true,
    "numTopAds": 3
  },
  "protocol": "https",
  "rawCss": ".gsc-control-cse{background:transparent!important;border:none!important;padding:0!important;box-shadow:none!important;font-family:inherit!important}.gsc-search-box{width:100%!important;padding:0!important;margin:0 auto!important;border-radius:999px!important;background:rgba(255,255,255,0.15)!important;backdrop-filter:blur(12px)!important;border:1px solid var(--br)!important;box-shadow:0 8px 24px rgba(0,0,0,0.08)!important;overflow:hidden!important}body.dark .gsc-search-box{background:rgba(15,23,42,0.6)!important;border-color:rgba(255,255,255,0.15)!important}.gsc-search-box table{width:100%!important;border-collapse:collapse!important}.gsc-search-box td{padding:0!important}.gsc-input-box{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;display:flex!important;align-items:center!important}.gsib_a{flex:1!important;display:flex!important;align-items:center!important}.gsib_b{flex:0 0 auto!important;margin-left:6px!important}.gsc-search-button-v2{flex:0 0 auto!important;background:linear-gradient(120deg,var(--a),var(--a2))!important;border:none!important;border-radius:999px!important;padding:10px 20px!important;margin-right:10px!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important}.gsc-search-button-v2 svg{fill:#050816!important}input.gsc-input{background:transparent!important;border:none!important;outline:none!important;font-size:16px!important;color:var(--txt)!important;padding:14px 50px!important;width:100%!important}body.dark input.gsc-input{color:var(--txtd)!important}input.gsc-input::placeholder{color:var(--mut)!important}body.dark input.gsc-input::placeholder{color:var(--mutd)!important}input.gsc-input:focus{outline:none!important;box-shadow:none!important;border:none!important}.gsc-completion-container{backdrop-filter:blur(12px)!important;background:rgba(255,255,255,0.8)!important;border-radius:12px!important;border:1px solid var(--br)!important}body.dark .gsc-completion-container{background:rgba(15,23,42,0.85)!important;border-color:rgba(255,255,255,0.15)!important}.gsc-completion-title,.gsc-completion-snippet{color:var(--txt)!important}body.dark .gsc-completion-title,body.dark .gsc-completion-snippet,body.dark .gsc-completion-title *,body.dark .gsc-completion-snippet *{color:var(--txtd)!important}.gsc-webResult.gsc-result{background:rgba(255,255,255,0.6)!important;backdrop-filter:blur(10px)!important;border-radius:16px!important;padding:16px!important;margin-bottom:16px!important;border:1px solid var(--br)!important}body.dark .gsc-webResult.gsc-result{background:rgba(15,23,42,0.7)!important;border-color:rgba(255,255,255,0.15)!important}.gs-title,.gs-title *{color:var(--txt)!important}body.dark .gs-title,body.dark .gs-title *{color:var(--txtd)!important}.gs-snippet{color:var(--mut)!important}body.dark .gs-snippet{color:var(--mutd)!important}.gsc-cursor-page{border-radius:999px!important;padding:6px 12px!important;border:1px solid var(--br)!important;background:rgba(255,255,255,0.4)!important}body.dark .gsc-cursor-page{background:rgba(15,23,42,0.6)!important;border-color:rgba(255,255,255,0.15)!important;color:var(--txtd)!important}.gsc-cursor-current-page{background:linear-gradient(120deg,var(--a),var(--a2))!important;color:#fff!important;border-color:transparent!important}.gsc-branding,.gcsc-branding,.gcsc-more-maybe-branding,.gcsc-find-more-on-google-root{display:none!important}body.dark .gs-title,body.dark .gs-title *,body.dark .gs-snippet,body.dark .gs-snippet *,body.dark .gs-visibleUrl,body.dark .gsc-result-info,body.dark .gsc-table-result *{color:var(--bg)!important}",
  "cse_token": "AEXjvhKoWmlVJ1WCLFpbQhzDvfdq:1773849065956",
  "isHostedPage": false,
  "exp": ["cc"],
  "cselibVersion": "b33cba5881f68fbf",
  "usqp": "CAM\u003d",
  "fexp": [121574859, 121574858, 73152292, 73152290]
});


//.gsc-control-cse{background:transparent!important;border:none!important;padding:0!important;box-shadow:none!important;font-family:inherit!important}.gsc-search-box{width:100%!important;padding:0!important;margin:0 auto!important;border-radius:999px!important;background:rgba(255,255,255,0.15)!important;backdrop-filter:blur(12px)!important;border:1px solid var(--br)!important;box-shadow:0 8px 24px rgba(0,0,0,0.08)!important;overflow:hidden!important}body.dark .gsc-search-box{background:rgba(15,23,42,0.6)!important;border-color:rgba(255,255,255,0.15)!important}.gsc-search-box table{width:100%!important;border-collapse:collapse!important}.gsc-search-box td{padding:0!important}.gsc-input-box{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;display:flex!important;align-items:center!important}.gsib_a{flex:1!important;display:flex!important;align-items:center!important}.gsib_b{flex:0 0 auto!important;margin-left:6px!important}.gsc-search-button-v2{flex:0 0 auto!important;background:linear-gradient(120deg,var(--a),var(--a2))!important;border:none!important;border-radius:999px!important;padding:10px 20px!important;margin-right:10px!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important}.gsc-search-button-v2 svg{fill:#050816!important}input.gsc-input{background:transparent!important;border:none!important;outline:none!important;font-size:16px!important;color:var(--txt)!important;padding:14px 50px!important;width:100%!important}body.dark input.gsc-input{color:var(--txtd)!important}input.gsc-input::placeholder{color:var(--mut)!important}body.dark input.gsc-input::placeholder{color:var(--mutd)!important}input.gsc-input:focus{outline:none!important;box-shadow:none!important;border:none!important}.gsc-completion-container{backdrop-filter:blur(12px)!important;background:rgba(255,255,255,0.8)!important;border-radius:12px!important;border:1px solid var(--br)!important}body.dark .gsc-completion-container{background:rgba(15,23,42,0.85)!important;border-color:rgba(255,255,255,0.15)!important}.gsc-completion-title,.gsc-completion-snippet{color:var(--txt)!important}body.dark .gsc-completion-title,body.dark .gsc-completion-snippet,body.dark .gsc-completion-title *,body.dark .gsc-completion-snippet *{color:var(--txtd)!important}.gsc-webResult.gsc-result{background:rgba(255,255,255,0.6)!important;backdrop-filter:blur(10px)!important;border-radius:16px!important;padding:16px!important;margin-bottom:16px!important;border:1px solid var(--br)!important}body.dark .gsc-webResult.gsc-result{background:rgba(15,23,42,0.7)!important;border-color:rgba(255,255,255,0.15)!important}.gs-title,.gs-title *{color:var(--txt)!important}body.dark .gs-title,body.dark .gs-title *{color:var(--txtd)!important}.gs-snippet{color:var(--mut)!important}body.dark .gs-snippet{color:var(--mutd)!important}.gsc-cursor-page{border-radius:999px!important;padding:6px 12px!important;border:1px solid var(--br)!important;background:rgba(255,255,255,0.4)!important}body.dark .gsc-cursor-page{background:rgba(15,23,42,0.6)!important;border-color:rgba(255,255,255,0.15)!important;color:var(--txtd)!important}.gsc-cursor-current-page{background:linear-gradient(120deg,var(--a),var(--a2))!important;color:#fff!important;border-color:transparent!important}.gsc-branding,.gcsc-branding,.gcsc-more-maybe-branding,.gcsc-find-more-on-google-root{display:none!important}body.dark .gs-title,body.dark .gs-title *,body.dark .gs-snippet,body.dark .gs-snippet *,body.dark .gs-visibleUrl,body.dark .gsc-result-info,body.dark .gsc-table-result *{color:var(--bg)!important}
