$(function() {
    $('.navbar-nav a').each(function(idx, elt) {
        $(elt).parent().removeClass('active');

        if (elt.href == location.href) {
            $(elt).parent().addClass('active');
        }
    });
});
