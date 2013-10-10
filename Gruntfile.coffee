module.exports = (grunt) ->
  grunt.initConfig

    directories:
      dev: 'build'
      build: 'build'
      release: 'release'

    context:
      release:
        directories:
          build: '<%= directories.release %>'
        coffee:
          options:
            sourceMap: false
        jade:
          options:
            pretty: false
        sass:
          options:
            sourcemap: false
            style: 'compressed'

    coffee:
      app:
        files:
          '<%= directories.build %>/js/app.js': ['app/js/**/*.coffee', '!app/js/modules/*.coffee']
        options:
          join: true
      modules:
        expand: true
        cwd: 'app/js/modules'
        src: '**/*.coffee'
        dest: '<%= directories.build %>'
        ext: '.js'
      options:
        sourceMap: true

    coffeelint:
      app: ['app/**/*.coffee', '!Gruntfile.coffee']
      gruntfile: 'Gruntfile.coffee'
      options:
        max_line_length:
          value: 120

    connect:
      server:
        options:
          base: '<%= directories.build %>'
          directory: '<%= directories.build %>'

    githubPages:
      target:
        src: '<%= directories.release %>'

    clean:
      dev: '<%= directories.dev %>'
      release: '<%= directories.release %>/*'
      target: '<%= directories.build %>/*'

    copy:
      app:
        expand: true
        cwd: 'app'
        dest: 'build'
        src: ['**/*', '!**/*.{coffee,jade,scss,png,jpg,gif}']
        filter: 'isFile'

    imagemin:
      app:
        expand: true
        cwd: 'app'
        src: '**/*.{png,jpg,gif}'
        dest: '<%= directories.build %>'

    jade:
      app:
        expand: true
        cwd: 'app'
        src: '**/*.jade'
        dest: '<%= directories.build %>'
        ext: '.html'
        filter: 'isFile'
      options:
        pretty: true

    sass:
      app:
        expand: true
        cwd: 'app'
        dest: '<%= directories.build %>'
        src: ['css/**.scss']
        ext: '.css'
        filter: 'isFile'
      options:
        sourcemap: true

    watch:
      options:
        livereload: true
      copy:
        files: ['app/**/*', '!app/**/*.{coffee,jade,scss}']
        tasks: ['copy', 'imagemin']
      gruntfile:
        files: 'Gruntfile.coffee'
        tasks: ['coffeelint:gruntfile']
      jade:
        files: ['app/**/*.{jade,md}']
        tasks: ['jade']
      sass:
        files: ['app/**/*.scss']
        tasks: ['sass']
      scripts:
        files: ['**/*.coffee', '!**/node_modules/**', '!Gruntfile.coffee']
        tasks: ['coffee']

  require('load-grunt-tasks')(grunt)

  grunt.registerTask 'context', (context) ->
    copyContext = (obj, prefix='') ->
      for k, v of obj
        if typeof v == 'object'
          copyContext v, prefix + k + '.'
        else
          grunt.config.set(prefix + k, v)
    copyContext grunt.config.get(['context', context])
    return

  grunt.registerTask 'build', ['clean:target', 'coffee', 'copy', 'jade', 'sass', 'imagemin']
  grunt.registerTask 'build:release', ['context:release', 'coffeelint', 'build']
  grunt.registerTask 'deploy', ['build:release', 'githubPages:target']
  grunt.registerTask 'default', ['build', 'connect', 'watch']
