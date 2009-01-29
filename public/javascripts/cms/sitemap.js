jQuery(function($){
  
  //----- Helper Functions -----------------------------------------------------
  //In all of this code, we are defining functions that we use later
  //None of this actually manipulates the DOM in any way
  
  //This is used to get the id part of an elementId
  //For example, if you have section_node_5, 
  //you pass this 'section_node_5', 'section_node' 
  //and this returns 5
  var getId = function(elementId, s) {
    return elementId.replace(s,'')
  }
  
  var addHoverToSectionNodes = function() {
    $('#sitemap table.section_node').hover(
      function() { $(this).addClass('hover')},
      function() { $(this).removeClass('hover')}
    )    
  }
  
  var disableButtons = function() {
    $('a.button').addClass('disabled').click(function(){return false})
  }
  
  var makeMovableRowsDraggable = function() {
    $('#sitemap table.movable').draggable({
      revert: 'invalid',
      revertDuration: 200,
      helper: 'clone',
      delay: 200,
      start: function(event, ui) {
        ui.helper.removeClass('hover').removeClass('selected')
      }
    })    
  }
  
  var jsonPost = function(url, params) {
    if($.cms.authenticity_token && $.cms.authenticity_token != '') {
      params['authenticity_token'] = $.cms.authenticity_token
    }
    $.post(url, params,
      function(data){
        if(data.success) {
          $.cms.showNotice(data.message)
        } else {
          $.cms.showError(data.message)
        }
      }, "json"
    );    
  }
  
  var moveSectionNode = function(sectionNodeId, move, otherSectionNodeId) {
    var url = '/cms/section_nodes/move_'+move+'/'+sectionNodeId
    var params = { _method: "PUT", section_node_id: otherSectionNodeId }
    jsonPost(url, params)
  }
  
  var moveSectionNodeToRoot = function(sectionNodeId, rootSectionId) {
    var url = '/cms/section_nodes/move_to_root/'+sectionNodeId
    var params = { _method: "PUT", section_id: rootSectionId }
    jsonPost(url, params)
  }  
  
  var nodeOnDrop = function(e, ui) {    
    //Remove any drop zone highlights still hanging out
    $('#sitemap td.drop-before, #sitemap td.node, #sitemap td.drop-after').removeClass('drop-over')

    //Get the object and the id for the src (what we are droping) 
    //and the dest (where we are dropping)
    var src = ui.draggable.parent().parent() //The UL the TABLE is in
    var sid = getId(src[0].id, 'section_node_')
    var dest = $(this).parent().parent().parent().parent().parent() //The UL the drop zone is in
    var did = getId(dest[0].id, 'section_node_')

    //If the src is a descendant of the dest, then forget it
    if(src == dest || $.inArray(src[0], dest.parents()) > -1) {
      return true;
    }   

    if(dest.hasClass('root')) {
      src.insertAfter(dest.find('table:first'))
      var rid = getId(dest[0].id, 'root_')
      moveSectionNodeToRoot(sid, rid)
    //Move to a section if the drop zone is the section
    } else {
      if($(this).hasClass('node') && $(this).hasClass('section')) {      
        var move = 'to_end'
        dest.find('li:first').append(src)
        openSection(dest[0])
      //If the drop zone is directly after an open section,
      //move this to the beginning of the section  
      } else if($(this).hasClass('drop-after') && dest.find('table:first img.folder-open').length > 0) {
        var move = 'to_beginning'
        src.insertAfter(dest.find('table:first'))
      } else {
        //insert before or after, based on the class of the drop zone
        if($(this).hasClass('drop-before')) {
          var move = 'before'
          src.insertBefore(dest)
        } else {
          var move = 'after'          
          src.insertAfter(dest)      
        }     
      }
      //Make the ajax call
      moveSectionNode(sid, move, did)      

    }

    //Make the thing we are dropping be selected
    selectSectionNode(src)

  }
  
  var enableDropZones = function() {
    $('#sitemap td.drop-before, #sitemap td.node, #sitemap td.drop-after').droppable({
      accept: 'table',
      tolerance: 'pointer',
      over: function(e, ui) {
        $(this).addClass('drop-over')
      },
      out: function(e, ui) {
        $(this).removeClass('drop-over')
      },
      drop: nodeOnDrop
    });    
  }  
    
  var clearSelectedSectionNode = function() {
    disableButtons()
    $('#sitemap table.section_node').removeClass('selected')    
  }
  
  var selectSectionNode = function(sectionNode) {
    clearSelectedSectionNode(sectionNode)
    enableButtonsForSectionNode(sectionNode)
    $(sectionNode).find('table:first').addClass('selected')    
  }
  
  var isSectionEmpty = function(id) {
    return $('#section_'+id).parents('li:first').find('ul').length == 0    
  }
  
  var enableButtonsForSectionNode = function(sectionNode) {
    enableButtonsForNode($(sectionNode).find('td.node')[0])
  }
  
  var enableButtonsForNode = function(node) {
    var id = getId(node.id, /(section|page|link)_/)
    if($(node).hasClass('section')) {
      enableButtonsForSection(id)
    } else if($(node).hasClass('page')) {
      enableButtonsForPage(id)
    } else if($(node).hasClass('link')) {
      enableButtonsForLink(id)
    }  
  }
  
  var enableButtonsForSection = function(id) {
    $('#properties-button')
      .removeClass('disabled')
      .attr('href','/cms/sections/edit/'+id)
      .unbind('click')
      .click(function(){return true})
    
    $('#add-page-button')
      .removeClass('disabled')
      .attr('href','/cms/pages/new?section_id='+id)
      .unbind('click')
      .click(function(){return true})

    $('#add-section-button')
      .removeClass('disabled')
      .attr('href','/cms/sections/new?section_id='+id)
      .unbind('click')
      .click(function(){return true})
      
    $('#add-link-button')
      .removeClass('disabled')
      .attr('href','/cms/links/new?section_id='+id)
      .unbind('click')
      .click(function(){return true}) 
    
    if(isSectionEmpty(id)) {
      $('#delete-button')
        .removeClass('disabled')
        .attr('href','/cms/sections/destroy/'+id+'.json')
        .unbind('click')
        .click(function(){
          if(confirm('Are you sure you want to delete this section?')) {
            var params = { _method: "DELETE" }
            if($.cms.authenticity_token && $.cms.authenticity_token != '') {
              params['authenticity_token'] = $.cms.authenticity_token
            }
            $.post($(this).attr('href'), params,
              function(data){
                if(data.success) {
                  $.cms.showNotice(data.message)
                } else {
                  $.cms.showError(data.message)
                }
              }, "json");
            $('#section_'+id).parents('.section_node:first').remove()            
          }
          return false;
        })            
    } else {
      $('#delete-button').addClass('disabled').unbind('click').click(function(){ return false})      
    }
         
  }
  
  var enableButtonsForPage = function(id) {
    $('#edit-button')
      .removeClass('disabled')
      .attr('href','/cms/pages/show/'+id)
      .unbind('click')
      .click(function(){return true})

    $('#properties-button')
      .removeClass('disabled')
      .attr('href','/cms/pages/edit/'+id)
      .unbind('click')
      .click(function(){return true})

    $('#delete-button')
      .removeClass('disabled')
      .attr('href','/cms/pages/destroy/'+id+'.json')
      .unbind('click')
      .click(function(){
        if(confirm('Are you sure you want to delete this page?')) {
          var params = { _method: "DELETE" }
          if($.cms.authenticity_token && $.cms.authenticity_token != '') {
            params['authenticity_token'] = $.cms.authenticity_token
          }
          $.post($(this).attr('href'), params,
            function(data){
              if(data.success) {
                $.cms.showNotice(data.message)
              } else {
                $.cms.showError(data.message)
              }
            }, "json");
          $('#page_'+id).parents('.section_node:first').remove()            
        }
        return false;
      })    
  }
  
  var enableButtonsForLink = function(id) {
    $('#properties-button')
      .removeClass('disabled')
      .attr('href','/cms/links/edit/'+id)
      .unbind('click')
      .click(function(){return true})    
  }

  var openSection = function(sectionNode) {
    var id = getId(sectionNode.id, 'section_node_')
    
    //Remember to re-open this section
    $.cookieSet.add('openSectionNodes', id, {path: '/', expires: 90})
    
    $(sectionNode).addClass('open')
    $(sectionNode).find('li:first > ul').show()
    $(sectionNode).find('li:first table:first img.folder').attr('src','/images/cms/icons/actions/folder_open.png').addClass("folder-open")    
  }
  
  var closeSection = function(sectionNode) {
    var id = getId(sectionNode.id, 'section_node_')
    
    //Remove this section from the set of open nodes
    $.cookieSet.remove('openSectionNodes', id, {path: '/', expires: 90})

    //close this
    $(sectionNode).removeClass('open')
    $(sectionNode).find('li:first > ul').hide()
    $(sectionNode).find('li:first table:first img.folder').attr('src','/images/cms/icons/actions/folder.png').removeClass("folder-open")    
  }
  
  var sectionNodeIsOpen = function(sectionNode) {
    return $(sectionNode).find('li:first table:first img.folder-open').length
  }
  
  var nodeOnClick = function() {
    
    var selected = $(this).hasClass('selected')
    clearSelectedSectionNode()
    $(this).addClass('selected')
    
    var node = $(this).find('td.node')[0]
    var id = getId(node.id, /(section|page|link)_/)
    var sectionNode = $(this).parents('ul:first')[0]
    
    selectSectionNode(sectionNode)
    if(!$(node).hasClass('root') && $(node).hasClass('section')) {
      if(sectionNodeIsOpen(sectionNode) && selected) {
        closeSection(sectionNode)  
      } else {
        openSection(sectionNode)
      }
    }
  }  
  
  var nodeOnDoubleClick = function() {
    if($('#edit-button').hasClass('disabled')) {
      //$('#properties-button').click()
      location.href = $('#properties-button')[0].href
    } else {
      //$('#edit-button').click()      
      location.href = $('#edit-button')[0].href
    }
  }
  
  var addNodeOnClick = function() {
    $('#sitemap table.section_node').click(nodeOnClick).dblclick(nodeOnDoubleClick)
  }
  
  //Whenever you open a section, a cookie is updated so that next time you view the sitemap
  //that section will start in open state
  var fireOnClickForOpenSectionNodes = function() {
    var openSectionNodeIds = $.cookieSet.get('openSectionNodes')
    $('#sitemap table.section_node:first').click()
    if(openSectionNodeIds) {
      $.each(openSectionNodeIds, function(i, e) { 
        $('#section_node_'+e+' table:first').click()
      })      
    }    
  }  
  
  //----- Init -----------------------------------------------------------------
  //In other words, stuff that happens when the page loads
  //This is where we actually manipulate the DOM, fire events, etc.
  
  addHoverToSectionNodes()  
  disableButtons()
  makeMovableRowsDraggable()
  enableDropZones()  
  addNodeOnClick()
  fireOnClickForOpenSectionNodes()

})
