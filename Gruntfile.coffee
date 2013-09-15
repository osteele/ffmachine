module.exports = (grunt) ->
  grunt.initConfig

    options:
      build_directory: 'build'
      release_directory: 'release'

    context:
      release:
        options:
          build_directory: '<%= options.release_directory %>'
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
          '<%= options.build_directory %>/js/app.js': ['app/js/**/*.coffee', '!app/js/modules/*.coffee']
        options:
          join: true
      modules:
        expand: true
        cwd: 'app/js/modules'
        src: '**/*.coffee'
        dest: '<%= options.build_directory %>'
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
          base: '<%= options.build_directory %>'

    githubPages:
      target:
        src: '<%= options.release_directory %>'

    clean:
      debug: '<%= options.build_directory %>'
      context: 'build'
      release: '<%= options.release_directory %>/*'

    copy:
      app:
        expand: true
        cwd: 'app'
        dest: 'build'
        src: ['**/*', '!**/*.{coffee,jade,png,scss}']
        filter: 'isFile'

    imagemin:
      app:
        expand: true
        cwd: 'app'
        src: '**/*.{png,jpg,gif}'
        dest: '<%= options.build_directory %>'

    jade:
      app:
        expand: true
        cwd: 'app'
        src: '**/*.jade'
        dest: '<%= options.build_directory %>'
        ext: '.html'
      options:
        pretty: true

    sass:
      app:
        expand: true
        cwd: 'app'
        dest: '<%= options.build_directory %>'
        src: ['css/**.scss']
        ext: '.css'
        filter: 'isFile'
      options:
        sourcemap: true

    watch:
      options:
        livereload: true
      copy:
        files: ['app/**/*', '!app/**/*.{coffee,jade,png,scss}']
        tasks: ['copy']
      gruntfile:
        files: 'Gruntfile.coffee'
        tasks: ['coffeelint:gruntfile']
      jade:
        files: ['app/**/*.jade']
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

  grunt.registerTask 'build', ['clean:context', 'coffee', 'copy', 'jade', 'sass', 'imagemin']
  grunt.registerTask 'build:release', ['context:release', 'coffeelint', 'build']
  grunt.registerTask 'deploy', ['build:release', 'githubPages:target']
  grunt.registerTask 'default', ['build', 'connect', 'watch']
