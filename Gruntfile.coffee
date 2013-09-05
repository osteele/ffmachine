module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    coffee:
      debug_bundle:
        files:
          'build/js/app.js': ['app/js/**/*.coffee', '!app/js/modules/*.coffee']
        options:
          join: true
          sourceMap: true
      release_bundle:
        files:
          'release/js/app.js': ['app/js/**/*.coffee', '!app/js/modules/*.coffee']
        options:
          join: true
      debug_modules:
        expand: true
        cwd: 'app/js/modules'
        src: '**/*.coffee'
        dest: 'build'
        ext: '.js'
        options:
          sourceMap: true
      release_modules:
        expand: true
        cwd: 'app/js/modules'
        src: '**/*.coffee'
        dest: 'release'
        ext: '.js'
    coffeelint:
      app: ['app/**/*.coffee', '!Gruntfile.coffee']
      gruntfile: 'Gruntfile.coffee'
      options:
        max_line_length:
          value: 120
    connect:
      server:
        options:
          base: 'build'
    githubPages:
      target:
        src: 'release'
    copy:
      debug:
        expand: true
        cwd: 'app'
        dest: 'build'
        src: ['**', '!**/*.coffee', '!**/*.jade', '!**/*.scss']
        filter: 'isFile'
      release:
        expand: true
        cwd: 'app'
        dest: 'release'
        src: ['**', '!**/*.coffee', '!**/*.jade', '!**/*.scss']
        filter: 'isFile'
    jade:
      debug:
        expand: true
        cwd: 'app'
        src: '**/*.jade'
        dest: 'build'
        ext: '.html'
        options:
          pretty: true
      release:
        expand: true
        cwd: 'app'
        src: '**/*.jade'
        dest: 'release'
        ext: '.html'
    sass:
      debug:
        expand: true
        cwd: 'app'
        dest: 'build'
        src: ['css/**.scss']
        ext: '.css'
        filter: 'isFile'
        options:
          sourcemap: true
      release:
        expand: true
        cwd: 'app'
        dest: 'release'
        src: ['css/**.scss']
        ext: '.css'
        filter: 'isFile'
        options:
          style: 'compressed'
    watch:
      options:
        livereload: true
      # coffeelint:
      #   files: ['**/*.coffee', '!**/node_modules/**', '!Gruntfile.coffee']
      #   tasks: ['coffeelint:app']
      #   options:
      #     livereload: false
      copy:
        files: ['app/**/*.css', 'app/**/*.html', 'app/**/*.js', 'app/**/*.png']
        tasks: ['copy:debug']
      gruntfile:
        files: 'Gruntfile.coffee'
        tasks: ['coffeelint:gruntfile']
      jade:
        files: ['app/*.jade', 'app/**/*.jade']
        tasks: ['jade:debug']
      sass:
        files: ['app/**/*.scss']
        tasks: ['sass:debug']
      scripts:
        files: ['**/*.coffee', '!**/node_modules/**', '!Gruntfile.coffee']
        tasks: ['coffee:debug']

  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-jade'
  grunt.loadNpmTasks 'grunt-contrib-sass'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-github-pages'
  grunt.loadNpmTasks 'grunt-notify'

  grunt.registerTask 'coffee:debug', ['coffee:debug_modules', 'coffee:debug_bundle']
  grunt.registerTask 'coffee:release', ['coffee:release_modules', 'coffee:release_bundle']
  grunt.registerTask 'build', ['coffee:debug', 'copy:debug', 'jade:debug', 'sass:debug']
  grunt.registerTask 'build:release', ['coffeelint', 'coffee:release', 'copy:release', 'jade:release', 'sass:release']
  grunt.registerTask 'deploy', ['build:release', 'githubPages:target']
  grunt.registerTask 'default', ['build', 'connect', 'watch']
