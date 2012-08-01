﻿var vagalume = (function () {
    
    var urlmodule = (function () {
        var forEachKey = (function () {
            if (Object.keys) {
                return function (obj, fn) {
                    if (typeof obj === 'object') {
                        var keys = Object.keys(obj);
                        for (var i = 0; i < keys.length; i++)
                            fn(keys[i], obj[keys[i]]);
                    }
                };
            }
            return function (obj, fn) {
                if (typeof obj === 'object') {
                    for (var key in obj) {
                        if (obj.hasOwnProperty(key))
                            fn(key, obj[key]);
                    }
                }
            };
        }());
        return {
            join: function (obj) {
                var url = obj.url || '';
                var params = obj.params || {};
                var hash = obj.hash || '';
                
                if (typeof url !== 'string' ||
                    typeof hash !== 'string' ||
                    typeof params !== 'object')
                    return '';
                    
                if (params.length !== 0) {
                    var params_url = '';
                    forEachKey(params, function (k, v) {
                        if (params_url.length !== 0)
                            params_url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
                        else
                            params_url = '?' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
                    });
                    url += params_url;
                }
                if (hash.length !== 0)
                    url += '#' + hash;
                
                return url;
            },
            parse: function (url) {
                var obj = {};
                var params = '';
                
                if (typeof url !== 'string' || url.length === 0)
                    return obj;
                    
                url = url.split('#');
                obj.url = url[0];
                if (url.length > 1)
                    obj.hash = url.slice(1).join('#');
                    
                url = obj.url.split('?');
                obj.url = url[0];
                if (url.length > 1)
                    params = url.slice(1).join('?');
                    
                if (params.length === 0)
                    return obj;
                
                params = params.split('&');
                obj.params = {};
                
                for (var i = 0; i < params.length; i++) {
                    url = params[i].split('=');
                    if (url.length >= 2) {
                        var k = url[0];
                        var v = url.slice(1).join('=');
                        
                        try {
                            k = decodeURIComponent(k);
                        } catch (e) {
                            k = unescape(k);
                        }
                        try {
                            v = decodeURIComponent(v);
                        } catch (e) {
                            v = unescape(v);
                        }
                        
                        if (!obj.params[k] && k.length !== 0 && v.length !== 0)
                            obj.params[k] = v;
                    }
                }
                
                return obj;
            },
        }
    }());
    
    var doQueryCaptcha = function (query, onCaptcha, onData) {
        function onPreData(data) {
            if (!data || !data.captcha) {
                onData(data);
                return;
            }

            var obj = urlmodule.parse(data.url);
            onCaptcha(data.url, function (input) {
                obj.serial = data.serial;
                obj.udig = input;
                doQueryCaptcha(urlmodule.join(obj), onCaptcha, onPreData);
            });
        }
        $.getJSON(query, onPreData);
    };

    return {
        getMusicListFromArtistUrl: function (artistUrl, onEnd) {
            function onData (data) {                  
                if (!data || !data.artist || !data.artist.lyrics || !data.artist.lyrics.item) {
                    onEnd([]);
                    return;
                }
                var musicList = [];
                for (var i = 0; i < data.artist.lyrics.item.length; i++) {
                    musicList.push({
                        id: data.artist.lyrics.item[i].id,
                        name: data.artist.lyrics.item[i].desc,
                    });
                }
                onEnd(musicList);
            }
            
            if (typeof artistUrl !== 'string' ||
                typeof onEnd !== 'function')
                return vagalume;
        
            if (artistUrl.charAt(artistUrl.length - 1) !== '/')
                artistUrl += '/';
                
            $.getJSON(artistUrl + 'index.js', onData);
            
            return vagalume;
        },
        getMusicIdFromName: function (artistName, musicName, onEnd) {
            function onData(data) {
                if (!data || !data.type || data.type === 'notfound' || !data.art) {
                    onEnd({});
                    return;
                }
                
                var obj = {
                    artist: {
                        name: data.art.id,
                        url: data.art.url,
                        picUrl_small: data.art.pic_small,
                        picUrl_medium: data.art.pic_medium,
                    },
                };
                
                if (data.type !== 'exact' || data.mus.length === 0) {
                    onEnd(obj);
                    return;
                }
                
                obj.music = {
                    id: data.mus[0].id,
                    name: data.mus[0].name,
                };
                onEnd(obj);
            }
        
            if (typeof musicName === 'function' && !onEnd) {
                onEnd = musicName;
                musicName = '';
            } else if (!musicName)
                musicName = '';
            
            if (!artistName ||
                typeof onEnd !== 'function')
                return null;
                
            $.getJSON(
                'http://www.vagalume.com.br/api/search.php?' +
                    'art=' + encodeURIComponent(artistName) +
                    '&mus=' + encodeURIComponent(musicName) +
                    '&nolyrics&extra=artpic',
                onData
            );
                    
            return vagalume;        
        },
        getMusicInfoFromId: function (musicId, onCaptcha, onEnd) {
            function onData(data) {
                if (!data || !data.type || data.type === 'notfound' ||
                    !data.art || !data.mus || data.mus.length <= 0) {
                    onEnd({});
                    return;
                }
                
                var obj = {
                    artist: {
                        name: data.art.name,
                        url: data.art.url,
                        picUrl_small: data.art.pic_small,
                        picUrl_medium: data.art.pic_medium,
                    }
                }
                
                // This shouldn't be possible, but who knows...
                if (data.type !== 'exact') {
                    onEnd({
                        artist: {
                            name: data.art.name,
                            url: data.art.url,
                        },
                    });
                    return;
                }
                
                obj.music = {
                    name: data.mus[0].name,
                    lyrics: data.mus[0].text,
                    youtubeId: data.mus[0].ytid,
                };
                
                if (data.mus[0].alb) {
                    obj.music.album = {
                        name: data.mus[0].alb.name,
                        year: data.mus[0].alb.year,
                        picUrl: data.mus[0].alb.img,
                    };
                }
               
                onEnd(obj);
            }
            
            if (!musicId ||
                typeof onCaptcha !== 'function' ||
                typeof onEnd !== 'function')
                return null;
                
            doQueryCaptcha(
                'http://www.vagalume.com.br/api/search.php?' +
                'musid=' + encodeURIComponent(musicId) +
                '&extra=alb,ytid,artpic',
                onCaptcha,
                onData
            );
                    
            return vagalume;
        },
        
        // reciclar tudo daqui para baixo
        // com pontos e vírgulas
        artistExists: function (artist, callback, onerror) {
            var artist = artist.toLowerCase().trim();
            var url = "http://www.vagalume.com.br/api/search.php?art="+encodeURIComponent(artist);
            function onData (data) {
                if (data.art &&
                    data.art.name.toLowerCase() === artist) { // don't alow close matches!
                    console.log(artist, data.art.name)
                    callback(true);
                } else
                    callback(false);
            }
            $.getJSON(url)
                .success(onData)
                    .error(onerror);
            return vagalume;
        },
        songExists: function (artist, song, callback, onerror) {
            // callback(null, data) if artist doesn't exist.
            // callback(false, data) if song didn't match completely
            // callback(true, data) if song matched.

            var url = "http://www.vagalume.com.br/api/search.php?"+
                      "art="+encodeURIComponent(artist)+
                      "&mus="+encodeURIComponent(song);
            function onData (data) {
                if (!data.art) // artist doesn't exist
                    callback(null, data)
                else if (data.type !== 'exact')
                    callback(false, data)
                else
                    callback(true, data)
            }
            $.getJSON(url)
                .success(onData)
                    .error(onerror);
            return vagalume;
        },
        // método interno (?)
        getRawSongName: function (name) {
            return String(name).replace(/\s?\(.*$/, '')
        },
        // método interno (?)
        getArtistURL: function (name, callback, onerror) {
            function onData (data) {
                if (data.type === 'notfound') {
                    onerror();
                    return;
                } else if (data.art.name.toLowerCase().trim() !== name) {
                    console.debug('not an exact match');
                    onerror();
                    return;
                }

                callback(data.art.url);
            }
            
            var name = name.toLowerCase().trim();
            var url = "http://www.vagalume.com.br/api/search.php?art="+encodeURIComponent(name);
            $.getJSON(url)
                .success(onData)
                    .error(onerror);
        },
        getArtistSongs: function (artist, callback, onerror) {
            vagalume.getArtistURL(artist, function (url) {
                function inArray (value, array) {
                    for (var i=0; i<array.length; i++)
                        if (array[i] === value)
                            return true;
                    return false;
                }
                
                function onData (data) {
                    if (!data.artist)
                        return onerror()
                    var all = data.artist.lyrics.item, lyrics = [];
                    for (var i=0; i<all.length; i++) {
                        if (inArray(vagalume.getRawSongName(all[i].desc),lyrics))
                            continue;
                        lyrics.push(vagalume.getRawSongName(all[i].desc));
                    }
                    callback(lyrics);
                }

                $.getJSON(url+'/index.js', onData, onerror)
            })
        },
    };
}());
