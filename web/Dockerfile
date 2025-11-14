FROM php:8.2-apache

# Rewrite aktivieren
RUN a2enmod rewrite

# .htaccess für /var/www/html ausdrücklich erlauben
RUN printf '<Directory "/var/www/html">\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' > /etc/apache2/conf-available/allow-htaccess.conf \
 && a2enconf allow-htaccess

# MySQL-Treiber
RUN docker-php-ext-install pdo_mysql

ENV TZ=Europe/Vienna
