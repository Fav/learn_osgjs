(function(){
    'use strict'

    var OSG = window.OSG;
    OSG.globalify();//干嘛用的
    var osg = OSG.osg;
    var osgUtil = OSG.osgUtil;
    var osgViewer = OSG.osgViewer;
    var osgDB = OSG.osgDB;

    var createScene = function ( viewer ) {
        var root = new osg.Node();
        /***************add your owner code****************/

        // Here we create a special Node
        // that will hold the transformation.
        var group = new osg.MatrixTransform();
        group.setMatrix( osg.Matrix.makeTranslate( -5, 10, -5, osg.Matrix.create() ) );
        var size = 5;
        // that node will be the geometry
        var ground = osg.createTexturedBox( 0, 0, 0, size, size, size );
        //We add geomtry as child of the transform
        // and now it's transformed magically
        group.addChild( ground );
        group.getOrCreateStateSet().setAttributeAndModes( new osg.CullFace( 'DISABLE' ) );
        root.addChild( group );
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

