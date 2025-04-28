// src/Header.js

import React from 'react'
import { Link } from 'react-router-dom'
import logo from './assets/vt-logo.png'

export default function Header({ title }) {
  return (
    <header className="map-header">
      <img src={logo} alt="logo" className="header-logo" />
      <h1>{title}</h1>
      <Link to="https://sites.google.com/view/dbms-dmv-housing-map" className="home-link"><span>Project Site</span></Link>
    </header>
  )
}