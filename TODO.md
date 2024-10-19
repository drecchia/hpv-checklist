TODO:
-----
Make maxSelectableItems work on multiple mode
virtualScroll
add loading animation
fireEvent on end of listing ( allowing user to remote load more data )
support remote search
auto focus search-input on open ( document.querySelector('.search-input').focus(); )

BUGS:
-----
Updating orginal item to disable do not reflect rendered elements, not event calling current refresh methods
Adding selected item after list already have one selected ( single mode ), allows dual selection

WONT DO: [ leaved to user handle on callback ]
-------
remote list
Remove from list after click
