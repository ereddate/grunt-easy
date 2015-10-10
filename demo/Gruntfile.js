// 包装函数
module.exports = function(grunt) {

  // 任务加载
  grunt.loadNpmTasks('grunt-cmd-transport');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-cmd-concat');
  //grunt.loadNpmTasks('grunt-ssh');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');

  var config = grunt.file.readJSON('spm.json'),
    args = {};
  for (name in config.args) {
    args[name] = grunt.file.readJSON(config.args[name] + "spm.json");
  }
  var concats = [],
    uglifys = [],
    lessBuilder = {},
    lesscss;

  function extend(target, args) {
    if (typeof args == "array" && !!args.length && args.length > 0) {
      target = target || [];
      var i, len;
      for (i = 0; i < (len = args.length); i++) {
        target.push(args[i]);
      }
    } else {
      target = target || {};
      for (name in args) {
        target[name] = args[name];
      }
    }
    return target;
  }

  function tmpl(str, args) {
    var name;
    for (name in args) {
      var regx = new RegExp("\\\<\\\%\\\=\\s*" + name + "\\s*\\\%\\\>", "gi");
      str = str.replace(regx, args[name]);
    }
    return str;
  }

  String.prototype.tmpl = function(args) {
    return tmpl(this, args);
  };

  //基本配置
  var gruntConfig = {
    //transport: {},
    concat: {
      options: {
        noncmd: true,
        footer: '\n/*! time:<%= grunt.template.today("yyyy-mm-dd") %> end \*\/'
      }
    },
    uglify: {
      options: {
        report: "gzip",
      }
    },
    less: {
      options: {
        compress: false,
        yuicompress: false
      }
    },
    watch: {
      options: {
        event: ['changed'],
        livereload: true
      },
      configs: {
        options: {
          reload: true
        },
        files: ["Gruntfile.js", "package.json", "spm.json", "trunk/**/js/*.json"],
        event: ["changed"]
      }
    }
  };

  //文件的合并和压缩
  var jsProjectName, jsProjectVer, jsModuleName, jsModules, jsProjectBaseName, jsProjectConcatOps, jsProjectUglifyOps, cssProjectName, cssProjectVer, cssFiles, alias, taskName, watchName;


  for (jsProjectName in args) {
    //判断是否支持require
    if ("transport" in args[jsProjectName]) {
      gruntConfig["transport"] = {};
      alias = args[jsProjectName]["transport"].options.alias = extend(config.alias, args[jsProjectName]["transport"].options.alias);
      gruntConfig["transport"][jsProjectName] = args[jsProjectName]["transport"];
    }

    jsModules = args[jsProjectName]["modules"];
    jsProjectVer = jsModules.version;
    jsProjectBaseName = args[jsProjectName].name;

    jsProjectConcatOps = {
      options: {
        banner: '\n/*! <%= name %> 18900360@qq.com start\*\/'.tmpl({
          name: jsProjectBaseName
        })
      }
    };

    jsProjectUglifyOps = {
      options: {
        banner: '\n/*! <%= name %> 18900360@qq.com start\*\/'.tmpl({
          name: jsProjectBaseName
        }),
        footer: '\n/*! time:<%= grunt.template.today("yyyy-mm-dd") %> end \*\/',
        mangle: false, //不混淆变量名
        preserveComments: false //删除注释，还可以为 false（删除全部注释），some（保留@preserve @license @cc_on等注释）
      }
    };

    //合并、压缩控制
    for (jsModuleName in jsModules["files"]) {

      var obj = jsModules["files"][jsModuleName];
      for (i = 0; i < obj.concat.src.length; i++) {
        obj.concat.src[i] = obj.concat.src[i].tmpl(extend(alias, {
          name: jsProjectBaseName
        }));
      }

      obj && obj.concat && concats.push({
        src: obj.concat.src,
        dest: obj.concat.dest.tmpl({
          ver: jsProjectVer,
          name: jsProjectBaseName
        })
      });
      obj && obj.uglify && uglifys.push({
        src: obj.uglify.src.tmpl({
          ver: jsProjectVer,
          name: jsProjectBaseName
        }),
        dest: obj.uglify.dest.tmpl({
          ver: jsProjectVer,
          name: jsProjectBaseName
        })
      });

    }

    var libs = args[jsProjectName]["libs"];

    concats.push(extend(libs.concat, {
      src: libs.concat.src,
      dest: (libs.concat.dest).tmpl({
        ver: libs.version,
        name: jsProjectBaseName
      })
    }));

    uglifys.push(extend(libs.uglify, {
      src: (libs.uglify.src).tmpl({
        ver: libs.version,
        name: jsProjectBaseName
      }),
      dest: (libs.uglify.dest).tmpl({
        ver: libs.version,
        name: jsProjectBaseName
      })
    }));

    gruntConfig.concat[jsProjectName] = {
      options: jsProjectConcatOps,
      files: concats
    };

    gruntConfig.uglify[jsProjectName] = {
      options: jsProjectUglifyOps,
      files: uglifys
    };

    //less配置控制
    lessBuilder = {};
    lesscss = args[jsProjectName].less;
    for (cssName in lesscss) {
      cssProjectName = lesscss[cssName].name;
      cssProjectVer = lesscss[cssName].version;
      cssFiles = lesscss[cssName]["files"];

      for (i = 0; i < cssFiles.length; i++) {
        lessBuilder[(cssFiles[i].dist).tmpl({
          name: cssProjectName,
          ver: cssProjectVer
        })] = cssFiles[i].src;
      }

      gruntConfig.less[cssName] = {
        options: {
          banner: '\n/*! <%= name %>.<%= ver %> 18900360@qq.com \*\/\n/*! time:<%= grunt.template.today("yyyy-mm-dd") %> \*\/'.tmpl({
            name: cssProjectName,
            ver: cssProjectVer
          })
        },
        files: lessBuilder
      };

    }

    //任务控制
    var task = args[jsProjectName]["task"];
    for (taskName in task) {
      grunt.registerTask(taskName, task[taskName]);
    }

    var watchs = args[jsProjectName]["watch"];
    for (watchName in watchs) {
      gruntConfig.watch[jsProjectName + "-" + watchName] = watchs[watchName];
    }

  }

  // 任务配置
  grunt.initConfig(gruntConfig);

};