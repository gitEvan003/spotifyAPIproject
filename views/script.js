(function () {
    window.addEventListener('load', init);

    function init () {
	id('artist-btn').addEventListener('click', toggleHiden);
	id('playlist-btn').addEventListener('click', toggleHiden);

    }

    function toggleHiden (e) {
	switch(e.target.id) {
	    case 'artist-btn':
		id('artist-lst').classList.toggle('hidden');		
		break
	    case 'playlist-btn':
		id('playlist-lst').classList.toggle('hidden');
		break 
	}
    }

//|||||||||||| util functions ||||||||||
    function id (id) {
       return document.getElementById(id); 
    }
}) ();
