'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Lod = require( 'osg/Lod' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var Matrix = require( 'osg/Matrix' );
var Vec3 = require( 'osg/Vec3' );


/**
 *  PagedLOD that can contains paged child nodes
 *  @class PagedLod
 */
var PagedLOD = function () {
    Lod.call( this );
    this._perRangeDataList = [];
    this._loading = false;
    this._expiryTime = 0.0;		//有效时间
    this._expiryFrame = 0;		//有效 框？ 帧？	
    this._centerMode = Lod.USER_DEFINED_CENTER;		//用户自定义中心
    this._frameNumberOfLastTraversal = 0;			//帧 数  最后  遍历
    this._databasePath = '';						//数据路径
    this._numChildrenThatCannotBeExpired = 0;		//无效子节点个数？
};

/**
 *  PerRangeData utility structure to store per range values  每个范围值？
 *  @class PerRangeData
 */
var PerRangeData = function () {
    this.filename = '';
    this.function = undefined;
    this.loaded = false;
    this.timeStamp = 0.0;		//时间戳
    this.frameNumber = 0;
    this.frameNumberOfLastTraversal = 0;
    this.dbrequest = undefined;
};

/** @lends PagedLOD.prototype */
PagedLOD.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Lod.prototype, {
    // Functions here
	//设置范围 
	/*比如  
	第0级 0～20
	第1级 20～100
	第3级 100～Number.MAX_VALUE
	*/
    setRange: function ( childNo, min, max ) {
        if ( childNo >= this._range.length ) {
            var r = [];
            r.push( [ min, min ] );
            this._range.push( r );
        }
        this._range[ childNo ][ 0 ] = min;
        this._range[ childNo ][ 1 ] = max;
    },
	//设置过期时间
    setExpiryTime: function ( expiryTime ) {
        this._expiryTime = expiryTime;
    },
	//数据库路径，内容是什么呢？
    setDatabasePath: function ( path ) {
        this._databasePath = path;
    },

    getDatabasePath: function () {
        return this._databasePath;
    },
	//设置 等级对应的文件名
	//setFileName(0,"cow.osg")
    setFileName: function ( childNo, filename ) {
        // May we should expand the vector first?
        if ( childNo >= this._perRangeDataList.length ) {
            var rd = new PerRangeData();
            rd.filename = filename;
            this._perRangeDataList.push( rd );
        } else {
            this._perRangeDataList[ childNo ].filename = filename;
        }
    },
	//设置层级对应的函数  应该理解成 加载某一层，使用的函数
    setFunction: function ( childNo, func ) {
        if ( childNo >= this._perRangeDataList.length ) {
            var rd = new PerRangeData();
            rd.function = func;
            this._perRangeDataList.push( rd );
        } else {
            this._perRangeDataList[ childNo ].function = func;
        }
    },
	//添加子节点  最大、最小显示范围
    addChild: function ( node, min, max ) {
        Lod.prototype.addChild.call( this, node, min, max );
        this._perRangeDataList.push( new PerRangeData() );
    },
	//添加子节点
    addChildNode: function ( node ) {
        Lod.prototype.addChildNode.call( this, node );
    },
	//帧数  最后 遍历  什么意思。。。。。
    setFrameNumberOfLastTraversal: function ( frameNumber ) {
        this._frameNumberOfLastTraversal = frameNumber;
    },

    getFrameNumberOfLastTraversal: function () {
        return this._frameNumberOfLastTraversal;
    },
	//设置时间戳
    setTimeStamp: function ( childNo, timeStamp ) {
        this._perRangeDataList[ childNo ].timeStamp = timeStamp;
    },
    setFrameNumber: function ( childNo, frameNumber ) {
        this._perRangeDataList[ childNo ].frameNumber = frameNumber;
    },
	//设置不会过期的子节点数目
    setNumChildrenThatCannotBeExpired: function ( num ) {
        this._numChildrenThatCannotBeExpired = num;
    },
    getNumChildrenThatCannotBeExpired: function () {
        return this._numChildrenThatCannotBeExpired;
    },
    getDatabaseRequest: function ( childNo ) {
        return this._perRangeDataList[ childNo ].dbrequest;
    },
	//移除过期节点
    removeExpiredChildren: function ( expiryTime, expiryFrame, removedChildren ) {
        if ( this.children.length <= this._numChildrenThatCannotBeExpired ) return;
        var i = this.children.length - 1;
        var timed, framed;
        timed = this._perRangeDataList[ i ].timeStamp + this._expiryTime;
        framed = this._perRangeDataList[ i ].frameNumber + this._expiryFrame;
        if ( timed < expiryTime && framed < expiryFrame && ( this._perRangeDataList[ i ].filename.length > 0 ||
                this._perRangeDataList[ i ].function !== undefined ) ) {
            removedChildren.push( this.children[ i ] );
            this.removeChild( this.children[ i ] );
            this._perRangeDataList[ i ].loaded = false;
            if ( this._perRangeDataList[ i ].dbrequest !== undefined ) {
                this._perRangeDataList[ i ].dbrequest._groupExpired = true;
            }
        }
    },
	//	遍历
    traverse: ( function () {

        // avoid to generate variable on the heap to limit garbage collection
        // instead create variable and use the same each time
        var zeroVector = Vec3.create();//原点
        var eye = Vec3.create();
        var viewModel = Matrix.create();

        return function ( visitor ) {

            var traversalMode = visitor.traversalMode;
            var updateTimeStamp = false;

            if ( visitor.getVisitorType() === NodeVisitor.CULL_VISITOR ) {
                this._frameNumberOfLastTraversal = visitor.getFrameStamp().getFrameNumber();
                updateTimeStamp = true;
            }

            switch ( traversalMode ) {

            case NodeVisitor.TRAVERSE_ALL_CHILDREN:

                for ( var index = 0; index < this.children.length; index++ ) {
                    this.children[ index ].accept( visitor );
                }
                break;

            case ( NodeVisitor.TRAVERSE_ACTIVE_CHILDREN ):
                var requiredRange = 0;

                // Calculate distance from viewpoint 计算从视点到物体的距离
                var matrix = visitor.getCurrentModelViewMatrix();
                Matrix.inverse( matrix, viewModel );
                if ( this._rangeMode === Lod.DISTANCE_FROM_EYE_POINT ) {
                    Matrix.transformVec3( viewModel, zeroVector, eye );
                    var d = Vec3.distance( eye, this.getBound().center() );//中心点到视点的距离
                    requiredRange = d * visitor.getLODScale();//所求范围  距离与LOD等级的乘积
                } else {
                    // Calculate pixels on screen
                    var projmatrix = visitor.getCurrentProjectionMatrix();//当前投影矩阵
                    // focal lenght is the value stored in projmatrix[0]
                    requiredRange = this.projectBoundingSphere( this.getBound(), matrix, projmatrix[ 0 ] );
                    // Get the real area value and apply LODScale
                    requiredRange = ( ( requiredRange * visitor.getViewport().width() * visitor.getViewport().width() ) * 0.25 ) / visitor.getLODScale();
                    if ( requiredRange < 0 ) requiredRange = this._range[ this._range.length - 1 ][ 0 ];
                }

                var needToLoadChild = false;
                var lastChildTraversed = -1;
                for ( var j = 0; j < this._range.length; ++j ) {
                    if ( this._range[ j ][ 0 ] <= requiredRange && requiredRange < this._range[ j ][ 1 ] ) {
                        if ( j < this.children.length ) {

                            if ( updateTimeStamp ) {
                                this._perRangeDataList[ j ].timeStamp = visitor.getFrameStamp().getSimulationTime();
                                this._perRangeDataList[ j ].frameNumber = visitor.getFrameStamp().getFrameNumber();
                            }

                            this.children[ j ].accept( visitor );
                            lastChildTraversed = j;
                        } else {
                            needToLoadChild = true;
                        }
                    }
                }
                if ( needToLoadChild ) {
                    var numChildren = this.children.length;
                    if ( numChildren > 0 && ( ( numChildren - 1 ) !== lastChildTraversed ) ) {

                        if ( updateTimeStamp ) {
                            this._perRangeDataList[ numChildren - 1 ].timeStamp = visitor.getFrameStamp().getSimulationTime();
                            this._perRangeDataList[ numChildren - 1 ].frameNumber = visitor.getFrameStamp().getFrameNumber();
                        }

                        this.children[ numChildren - 1 ].accept( visitor );
                    }
                    // now request the loading of the next unloaded child.  请求加载下一个未加载的子节点
                    if ( numChildren < this._perRangeDataList.length ) {
                        // compute priority from where abouts in the required range the distance falls.
                        var priority = ( this._range[ numChildren ][ 0 ] - requiredRange ) / ( this._range[ numChildren ][ 1 ] - this._range[ numChildren ][ 0 ] );
                        if ( this._rangeMode === Lod.PIXEL_SIZE_ON_SCREEN ) {
                            priority = -priority;
                        }
                        // Here we do the request
                        var group = visitor.nodePath[ visitor.nodePath.length - 1 ];
                        if ( this._perRangeDataList[ numChildren ].loaded === false ) {
                            this._perRangeDataList[ numChildren ].loaded = true;
                            var dbhandler = visitor.getDatabaseRequestHandler();
                            this._perRangeDataList[ numChildren ].dbrequest = dbhandler.requestNodeFile( this._perRangeDataList[ numChildren ].function, this._databasePath + this._perRangeDataList[ numChildren ].filename, group, visitor.getFrameStamp().getSimulationTime(), priority );
                        } else {
                            // Update timestamp of the request.
                            if ( this._perRangeDataList[ numChildren ].dbrequest !== undefined ) {
                                this._perRangeDataList[ numChildren ].dbrequest._timeStamp = visitor.getFrameStamp().getSimulationTime();
                                this._perRangeDataList[ numChildren ].dbrequest._priority = priority;
                            } else {
                                // The DB request is undefined, so the DBPager was not accepting requests, we need to ask for the child again.
                                this._perRangeDataList[ numChildren ].loaded = false;
                            }
                        }
                    }
                }
                break;
            default:
                break;
            }
        };
    } )()


} ), 'osg', 'PagedLOD' );

MACROUTILS.setTypeID( PagedLOD );
module.exports = PagedLOD;
