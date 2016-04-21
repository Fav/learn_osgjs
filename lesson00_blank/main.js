(function(){
    'use strict'

    var OSG = window.OSG;
    OSG.globalify();
    var osg = OSG.osg;
    var osgUtil = OSG.osgUtil;
    var osgViewer = OSG.osgViewer;
    var osgDB = OSG.osgDB;

    var createScene = function ( viewer ) {
        var root = new osg.Node();
        /***************add your owner code****************/

        /***************add your owner code****************/
        return root;
    };

    var onLoad = function () {
        var canvas = document.getElementById( 'View' );
        var viewer = new osgViewer.Viewer( canvas );
        var node = createScene( viewer );
        var lightnew = new osg.Light();
        node.light = lightnew;
        viewer.init();
        viewer.setLightingMode(osgViewer.View.LightingMode.NO_LIGHT );
        viewer.setLight( lightnew );
        viewer.getCamera().setClearColor( [ 0.3, 0.3, 0.3, 0.3 ] );
        viewer.setSceneData(node);
        viewer.setupManipulator();
        viewer.run();
    };
    window.addEventListener('load',onLoad,true);
})();

